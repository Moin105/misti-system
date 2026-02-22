import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Validate required environment variables
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY environment variable is required");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const adminEmail = Deno.env.get("ADMIN_EMAIL");
if (!adminEmail) {
  throw new Error("ADMIN_EMAIL environment variable is required");
}

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error("Missing required Supabase environment variables");
}

const resend = new Resend(resendApiKey);

// Admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Regular client for auth verification
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  type: "created" | "paid" | "status_changed";
  newStatus?: string;
}

class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return jsonResponse(
    {
      error: message,
      code,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
    status,
  );
}

const getStatusBadgeColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "#FFA500",
    processing: "#2196F3",
    completed: "#4CAF50",
    cancelled: "#F44336",
  };
  return colors[status] || "#999";
};

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "METHOD_NOT_ALLOWED", "Method not allowed. Use POST.");
    }

    // Auth is optional when verify_jwt=false. If token exists and is valid, we use it for ownership checks.
    const authHeader = req.headers.get("authorization");
    let user: { id: string } | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!authError && data.user) {
        user = { id: data.user.id };
      } else {
        console.warn("[SEND-ORDER-NOTIFICATION] Invalid/expired token provided, continuing as unauthenticated", {
          requestId,
          authError: authError?.message ?? "unknown",
        });
      }
    }

    let body: OrderNotificationRequest;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    const { orderId, type, newStatus } = body;
    if (!orderId || typeof orderId !== "string") {
      throw new HttpError(400, "INVALID_ORDER_ID", "orderId is required");
    }
    if (!["created", "paid", "status_changed"].includes(type)) {
      throw new HttpError(400, "INVALID_TYPE", "type must be one of: created, paid, status_changed");
    }
    if (type === "status_changed") {
      const allowedStatus = ["pending", "processing", "completed", "cancelled"];
      if (!newStatus || !allowedStatus.includes(newStatus)) {
        throw new HttpError(400, "INVALID_STATUS", "newStatus is required for status_changed");
      }
    }

    console.log("[SEND-ORDER-NOTIFICATION] Processing request", {
      requestId,
      orderId,
      type,
      authenticated: Boolean(user),
    });

    let isAdmin = false;
    if (user) {
      const { data: userRoles, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !roleError && userRoles !== null;
    }

    // Verify the order belongs to the user or user is admin
    const { data: orderCheck, error: orderCheckError } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderCheckError || !orderCheck) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    // If caller is authenticated, enforce ownership/admin check.
    // If unauthenticated, request is allowed because verify_jwt is disabled by configuration.
    if (user && orderCheck.user_id !== user.id && !isAdmin) {
      throw new HttpError(403, "FORBIDDEN", "User does not have access to this order");
    }

    // Fetch order details with items
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          selected_options
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Site URL for order links
    const siteUrl = "https://misti.services";
    const customerOrderLink = `${siteUrl}/order/${order.id}`;
    const adminOrderLink = `${siteUrl}/admin?tab=orders&orderId=${order.id}`;

    // Format selected options for display - TABLE BASED for email compatibility
    const formatOptions = (options: any): string => {
      if (!options || typeof options !== 'object') return '';
      
      const optionLabels: Record<string, string> = {
        slider_value: 'Amount',
        slider_config: 'Configuration',
        serverid: 'Server',
        factiongold: 'Faction',
        delgoldfresh: 'Delivery Method',
        delgoldfreshdetails: 'Delivery Details',
        region: 'Region',
        platform: 'Platform',
        faction: 'Faction',
        class: 'Class',
        level: 'Level',
      };
      
      const optionRows = Object.entries(options)
        .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => {
          const label = optionLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `<tr>
            <td style="padding: 4px 0 4px 12px; font-size: 13px; color: #888; border-left: 3px solid #667eea;">${label}:</td>
            <td style="padding: 4px 0 4px 8px; font-size: 13px; color: #333; font-weight: 500;">${String(value)}</td>
          </tr>`;
        })
        .join('');
      
      return optionRows ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px;">${optionRows}</table>` : '';
    };

    // Prepare order items HTML with selected options - TABLE BASED
    const itemsHtml = order.order_items
      .map((item: any) => {
        const optionsHtml = formatOptions(item.selected_options);
        const itemTotal = (item.unit_price * item.quantity).toFixed(2);
        
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: top;">
                    <p style="margin: 0 0 4px 0; font-weight: 600; font-size: 15px; color: #1a1a2e;">${item.product_name}</p>
                    <p style="margin: 0; font-size: 13px; color: #666;">Qty: ${item.quantity}</p>
                    ${optionsHtml}
                  </td>
                  <td style="vertical-align: top; text-align: right; width: 100px;">
                    <p style="margin: 0; font-weight: 600; font-size: 15px; color: #667eea;">$${itemTotal}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      })
      .join("");

    const statusColor = getStatusBadgeColor(order.status);
    const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);

    // Calculate discount info - TABLE BASED
    const hasDiscounts = order.coupon_discount > 0 || order.cashback_used > 0 || order.referral_discount > 0;
    const discountsHtml = hasDiscounts ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px; background: #f0fdf4; border-radius: 8px;">
        <tr><td style="padding: 16px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            ${order.coupon_discount > 0 ? `<tr><td style="padding: 4px 0; font-size: 14px; color: #16a34a;">Coupon Discount:</td><td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 600;">-$${order.coupon_discount.toFixed(2)}</td></tr>` : ''}
            ${order.cashback_used > 0 ? `<tr><td style="padding: 4px 0; font-size: 14px; color: #16a34a;">Cashback Used:</td><td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 600;">-$${order.cashback_used.toFixed(2)}</td></tr>` : ''}
            ${order.referral_discount > 0 ? `<tr><td style="padding: 4px 0; font-size: 14px; color: #16a34a;">Referral Discount:</td><td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 600;">-$${order.referral_discount.toFixed(2)}</td></tr>` : ''}
          </table>
        </td></tr>
      </table>
    ` : '';

    const cashbackEarnedHtml = order.cashback_earned > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
        <tr>
          <td style="padding: 14px 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; font-size: 14px; text-align: center;">
            🎁 <strong>Cashback Earned:</strong> $${order.cashback_earned.toFixed(2)} added to your account!
          </td>
        </tr>
      </table>
    ` : '';

    // Customer email
    const customerSubject = type === "created" 
      ? `Order Confirmation - ${order.order_number}`
      : type === "paid"
      ? `✅ Payment Confirmed - ${order.order_number}`
      : `Order Status Update - ${order.order_number}`;

    const customerHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center;">
                      <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                        ${type === "created" ? "🎉 Thank You!" : type === "paid" ? "✅ Payment Confirmed!" : "📦 Status Update"}
                      </h1>
                      <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9);">
                        Order <strong>#${order.order_number}</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Status Badge -->
                  <tr>
                    <td align="center" style="padding: 32px 40px 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color: ${statusColor}; padding: 12px 28px; border-radius: 50px;">
                            <span style="font-size: 14px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">${statusText}</span>
                          </td>
                        </tr>
                      </table>
                      ${type === "paid" ? `
                        <p style="margin: 20px 0 0 0; font-size: 15px; color: #666666;">
                          Your payment has been received and your order is now being processed!
                        </p>
                      ` : type === "status_changed" ? `
                        <p style="margin: 20px 0 0 0; font-size: 15px; color: #666666;">
                          Your order status has been updated. We're on it!
                        </p>
                      ` : ""}
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr><td style="border-bottom: 2px solid #667eea;"></td></tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Order Items Section -->
                  <tr>
                    <td style="padding: 24px 40px;">
                      <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1a1a2e; text-transform: uppercase; letter-spacing: 0.5px;">
                        Order Items
                      </h2>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        ${itemsHtml}
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Discounts -->
                  ${hasDiscounts ? `
                  <tr>
                    <td style="padding: 0 40px;">
                      ${discountsHtml}
                    </td>
                  </tr>
                  ` : ''}
                  
                  <!-- Total -->
                  <tr>
                    <td style="padding: 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                        <tr>
                          <td style="padding: 24px 28px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="font-size: 14px; color: rgba(255,255,255,0.85);">Total Paid</td>
                                <td style="text-align: right; font-size: 32px; font-weight: 700; color: #ffffff;">$${order.total_amount.toFixed(2)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Cashback Earned -->
                  ${order.cashback_earned > 0 ? `
                  <tr>
                    <td style="padding: 0 40px;">
                      ${cashbackEarnedHtml}
                    </td>
                  </tr>
                  ` : ''}
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 32px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                            <a href="${customerOrderLink}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                              View Your Order →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Notes -->
                  ${order.notes ? `
                  <tr>
                    <td style="padding: 0 40px 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; border-left: 4px solid #667eea;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #667eea;">ORDER NOTES</p>
                            <p style="margin: 0; font-size: 14px; color: #555555;">${order.notes}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ""}
                  
                  <!-- Support -->
                  <tr>
                    <td style="padding: 0 40px 32px 40px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; color: #888888;">
                        Questions? Email us at <a href="mailto:support@misti.services" style="color: #667eea;">support@misti.services</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
                      <p style="margin: 0; font-size: 12px; color: #888888;">
                        © ${new Date().getFullYear()} Misti Services. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to customer
    const customerEmail = await resend.emails.send({
      from: "Misti Boosting <support@misti.services>",
      to: [order.customer_email],
      subject: customerSubject,
      html: customerHtml,
    });

    console.log("Customer email sent:", customerEmail);

    // Admin notification - more detailed
    const adminSubject = type === "created"
      ? `🔔 New Order: ${order.order_number} - $${order.total_amount.toFixed(2)}`
      : type === "paid"
      ? `💰 Payment Received: ${order.order_number} - $${order.total_amount.toFixed(2)}`
      : `📦 Status Changed: ${order.order_number} → ${statusText}`;

    const adminHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1a1a2e;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: ${type === "created" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"}; padding: 32px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                              ${type === "created" ? "🔔 New Order Alert" : "📦 Status Changed"}
                            </h1>
                            <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">
                              ${new Date(order.created_at).toLocaleString()}
                            </p>
                          </td>
                          <td style="text-align: right; vertical-align: top;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background: rgba(255,255,255,0.2); padding: 10px 18px; border-radius: 8px;">
                                  <span style="font-size: 20px; font-weight: 700; color: #ffffff;">$${order.total_amount.toFixed(2)}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Order Number & Status -->
                  <tr>
                    <td style="padding: 28px 40px; border-bottom: 1px solid #eee;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td>
                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
                            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e;">${order.order_number}</p>
                          </td>
                          <td style="text-align: right; vertical-align: middle;">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background-color: ${statusColor}; padding: 10px 24px; border-radius: 50px;">
                                  <span style="font-size: 13px; font-weight: 600; color: #ffffff; text-transform: uppercase;">${statusText}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Customer Details -->
                  <tr>
                    <td style="padding: 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px;">
                        <tr>
                          <td style="padding: 20px 24px;">
                            <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 1px;">
                              👤 Customer Details
                            </p>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #888888; width: 100px;">Name:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #333333; font-weight: 500;">${order.customer_name || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #888888;">Email:</td>
                                <td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${order.customer_email}" style="color: #667eea; text-decoration: none;">${order.customer_email}</a></td>
                              </tr>
                              ${order.contact_details ? `
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #888888;">Contact:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #333333; font-weight: 500;">${order.contact_details}</td>
                              </tr>
                              ` : ''}
                              ${order.country ? `
                              <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #888888;">Country:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #333333; font-weight: 500;">${order.country}</td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Customer Notes -->
                  ${order.notes ? `
                  <tr>
                    <td style="padding: 0 40px 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase;">📝 Customer Notes</p>
                            <p style="margin: 0; font-size: 14px; color: #92400e;">${order.notes}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ` : ""}
                  
                  <!-- Order Items -->
                  <tr>
                    <td style="padding: 0 40px 24px 40px;">
                      <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 1px;">
                        📦 Order Items
                      </p>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8fafc; border-radius: 12px;">
                        <tr>
                          <td style="padding: 8px 20px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              ${itemsHtml}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Discounts -->
                  ${hasDiscounts ? `
                  <tr>
                    <td style="padding: 0 40px;">
                      ${discountsHtml}
                    </td>
                  </tr>
                  ` : ''}
                  
                  <!-- Total -->
                  <tr>
                    <td style="padding: 24px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #1a1a2e; border-radius: 12px;">
                        <tr>
                          <td style="padding: 24px 28px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                              <tr>
                                <td style="font-size: 14px; color: rgba(255,255,255,0.7);">Order Total</td>
                                <td style="text-align: right; font-size: 36px; font-weight: 700; color: #10b981;">$${order.total_amount.toFixed(2)}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 8px 40px 40px 40px;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
                            <a href="${adminOrderLink}" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                              Manage Order in Admin →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
                      <p style="margin: 0; font-size: 12px; color: #888888;">
                        Misti Services Admin Notification
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to admin
    const adminEmailResult = await resend.emails.send({
      from: "Misti Orders <support@misti.services>",
      to: [adminEmail],
      subject: adminSubject,
      html: adminHtml,
    });

    console.log("Admin email sent:", adminEmailResult);

    return jsonResponse({
      success: true,
      requestId,
      customerEmail,
      adminEmail: adminEmailResult,
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      console.error("[SEND-ORDER-NOTIFICATION] Handled error", {
        requestId,
        code: error.code,
        status: error.status,
        message: error.message,
        details: error.details,
      });
      return errorResponse(requestId, error.status, error.code, error.message, error.details);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error("[SEND-ORDER-NOTIFICATION] Unhandled error", { requestId, error });
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "Failed to send order notification", {
      originalMessage: message,
    });
  }
};

serve(handler);
