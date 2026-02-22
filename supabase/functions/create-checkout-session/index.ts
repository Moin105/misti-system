import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { checkRateLimit, getClientIP } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  couponDiscount?: number;
  couponCode?: string;
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

function jsonResponse(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return jsonResponse(
    {
      error: message,
      code,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
    status,
    extraHeaders,
  );
}

// Validation schema for checkout requests
const checkoutRequestSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  orderNumber: z.string().min(1).max(50),
  totalAmount: z.number().positive("Total amount must be positive").max(1000000, "Total amount exceeds maximum"),
  items: z.array(z.object({
    name: z.string().min(1).max(255),
    quantity: z.number().int().positive().max(1000),
    unitPrice: z.number().positive().max(100000),
  })).min(1, "Items array cannot be empty").max(100),
  couponDiscount: z.number().min(0).optional(),
  couponCode: z.string().optional(),
});

serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started", { requestId, method: req.method });

    if (req.method !== "POST") {
      throw new HttpError(405, "METHOD_NOT_ALLOWED", "Method not allowed. Use POST.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeSecretKey) {
      throw new HttpError(
        500,
        "MISSING_ENV",
        "Server configuration error",
        {
          supabaseUrl: Boolean(supabaseUrl),
          supabaseAnonKey: Boolean(supabaseAnonKey),
          supabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
          stripeSecretKey: Boolean(stripeSecretKey),
        },
      );
    }

    // Use anon key client for optional auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Use service role key client for database queries (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    let user: { id: string; email: string | null } | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (!userError && userData.user) {
        user = { id: userData.user.id, email: userData.user.email ?? null };
        console.log("[CREATE-CHECKOUT] User authenticated", { requestId, userId: user.id });
      } else {
        // Keep function resilient when JWT verification is disabled or token is stale.
        console.warn("[CREATE-CHECKOUT] Optional auth failed, continuing with order verification only", {
          requestId,
          authError: userError?.message ?? "unknown",
        });
      }
    } else {
      console.log("[CREATE-CHECKOUT] No bearer token provided, using order verification path", { requestId });
    }

    // Rate limit: prefer user id, fallback to caller IP.
    const rateLimitIdentifier = user?.id ?? `ip:${getClientIP(req)}`;
    const rateLimit = await checkRateLimit(supabaseAdmin, rateLimitIdentifier, {
      endpoint: "create_checkout",
      limit: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimit.allowed) {
      await supabaseAdmin.rpc("log_security_event", {
        p_function_name: "checkout_rate_limited",
        p_user_id: user?.id ?? null,
        p_operation_details: { identifier: rateLimitIdentifier, request_id: requestId },
        p_severity: "warning",
      });

      return errorResponse(
        requestId,
        429,
        "RATE_LIMITED",
        "Rate limit exceeded. Maximum 10 checkout sessions per hour.",
        { retryAfter: 3600 },
        { "X-RateLimit-Remaining": "0" },
      );
    }

    let rawData: unknown;
    try {
      rawData = await req.json();
    } catch {
      throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    let validatedData: CheckoutRequest;
    try {
      validatedData = checkoutRequestSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          "Invalid request data",
          error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        );
      }
      throw error;
    }

    const { orderId, orderNumber, totalAmount, items, couponCode } = validatedData;
    console.log("[CREATE-CHECKOUT] Request validated", {
      requestId,
      orderId,
      orderNumber,
      totalAmount,
      itemCount: items.length,
      couponCode: couponCode ?? null,
    });

    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("user_id, customer_email, total_amount")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found", { orderId });
    }

    if (user && orderData.user_id !== user.id) {
      await supabaseAdmin.rpc("log_security_event", {
        p_function_name: "checkout_unauthorized",
        p_user_id: user.id,
        p_operation_details: { attempted_order_id: orderId, request_id: requestId },
        p_severity: "error",
      });

      throw new HttpError(403, "ORDER_OWNERSHIP_MISMATCH", "Unauthorized: Order does not belong to user");
    }

    const amountDifference = Math.abs(orderData.total_amount - totalAmount);
    if (amountDifference > 0.01) {
      throw new HttpError(
        400,
        "AMOUNT_MISMATCH",
        "Amount verification failed",
        {
          expected: orderData.total_amount,
          received: totalAmount,
          difference: amountDifference,
        },
      );
    }

    console.log("[CREATE-CHECKOUT] Order verified", {
      requestId,
      orderId,
      userId: user?.id ?? orderData.user_id,
      amount: totalAmount,
    });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const customerEmail = user?.email || orderData.customer_email || undefined;
    const customers = customerEmail
      ? await stripe.customers.list({ email: customerEmail, limit: 1 })
      : { data: [] };
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer found", { requestId, customerId });
    } else {
      console.log("[CREATE-CHECKOUT] No existing customer, will create during checkout", { requestId });
    }

    const itemsTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const hasPriceAdjustment = Math.abs(totalAmount - itemsTotal) > 0.01;

    if (hasPriceAdjustment) {
      const adjustmentType = totalAmount < itemsTotal ? "discount" : "surcharge";
      console.log("[CREATE-CHECKOUT] Price adjustment detected", {
        requestId,
        itemsTotal: itemsTotal.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        adjustment: (totalAmount - itemsTotal).toFixed(2),
        type: adjustmentType,
        couponCode: couponCode || "none",
      });
    }

    const lineItems = hasPriceAdjustment
      ? [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `Order ${orderNumber}${couponCode ? ` (Code: ${couponCode})` : ""}`,
            description: items.map((item) => `${item.name} x${item.quantity}`).join(", "),
          },
          unit_amount: Math.round(totalAmount * 100),
        },
        quantity: 1,
      }]
      : items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }));

    const origin = req.headers.get("origin") || "https://misti.services";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${origin}/checkout?canceled=true`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        user_id: user?.id ?? orderData.user_id,
        request_id: requestId,
      },
    });

    console.log("[CREATE-CHECKOUT] Checkout session created", { requestId, sessionId: session.id });

    await supabaseAdmin.rpc("log_security_event", {
      p_function_name: "checkout_session_created",
      p_user_id: user?.id ?? orderData.user_id,
      p_operation_details: { order_id: orderId, amount: totalAmount, request_id: requestId },
      p_severity: "info",
    });

    return jsonResponse({ url: session.url, sessionId: session.id, requestId }, 200);
  } catch (error) {
    if (error instanceof HttpError) {
      console.error("[CREATE-CHECKOUT] Handled error", {
        requestId,
        code: error.code,
        status: error.status,
        message: error.message,
        details: error.details,
      });
      return errorResponse(requestId, error.status, error.code, error.message, error.details);
    }

    const maybeMessage = error instanceof Error ? error.message : String(error);
    const isLikelyAuthFailure = /401|unauthorized|invalid api key|invalid token/i.test(maybeMessage);
    const fallbackCode = isLikelyAuthFailure ? "UPSTREAM_AUTH_FAILURE" : "INTERNAL_ERROR";
    const fallbackMessage = isLikelyAuthFailure
      ? "Authentication failed in upstream service"
      : "An unexpected error occurred";

    console.error("[CREATE-CHECKOUT] Unhandled error", { requestId, error });
    return errorResponse(requestId, isLikelyAuthFailure ? 502 : 500, fallbackCode, fallbackMessage, {
      originalMessage: maybeMessage,
    });
  }
});
