import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://esm.sh/zod@3.22.4";
import { checkRateLimit } from "../_shared/rateLimit.ts";

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

// Validation schema for checkout requests
const checkoutRequestSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  orderNumber: z.string().min(1).max(50),
  totalAmount: z.number().positive("Total amount must be positive").max(1000000, "Total amount exceeds maximum"),
  items: z.array(z.object({
    name: z.string().min(1).max(255),
    quantity: z.number().int().positive().max(1000),
    unitPrice: z.number().positive().max(100000)
  })).min(1, "Items array cannot be empty").max(100),
  couponDiscount: z.number().min(0).optional(),
  couponCode: z.string().optional()
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use anon key client for auth validation
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Use service role key client for database queries (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[CREATE-CHECKOUT] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    console.log("[CREATE-CHECKOUT] User authenticated:", user.email);

    // Rate limit: 10 checkout sessions per hour per user
    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, {
      endpoint: 'create_checkout',
      limit: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimit.allowed) {
      // Log rate limit
      await supabaseAdmin.rpc("log_security_event", {
        p_function_name: "checkout_rate_limited",
        p_user_id: user.id,
        p_operation_details: {},
        p_severity: "warning",
      });

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 10 checkout sessions per hour.',
          retryAfter: 3600 
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            ...corsHeaders 
          },
        }
      );
    }

    // Parse and validate request body
    const rawData = await req.json();
    let validatedData: CheckoutRequest;
    
    try {
      validatedData = checkoutRequestSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[CREATE-CHECKOUT] Validation error:", error.errors);
        return new Response(JSON.stringify({ 
          error: "Invalid request data", 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      throw error;
    }

    const { orderId, orderNumber, totalAmount, items, couponDiscount, couponCode } = validatedData;
    console.log("[CREATE-CHECKOUT] Request validated:", { orderId, orderNumber, totalAmount, itemCount: items.length, couponDiscount, couponCode });

    // Verify order ownership and amount (using admin client to bypass RLS)
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('user_id, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error("[CREATE-CHECKOUT] Order not found:", orderId);
      return new Response(JSON.stringify({ error: "Order not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (orderData.user_id !== user.id) {
      console.error("[CREATE-CHECKOUT] Order ownership verification failed");
      
      // Log unauthorized access attempt
      await supabaseAdmin.rpc("log_security_event", {
        p_function_name: "checkout_unauthorized",
        p_user_id: user.id,
        p_operation_details: { attempted_order_id: orderId },
        p_severity: "error",
      });

      return new Response(JSON.stringify({ error: "Unauthorized: Order does not belong to user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Cross-check total amount (allow 1 cent tolerance for rounding)
    const amountDifference = Math.abs(orderData.total_amount - totalAmount);
    if (amountDifference > 0.01) {
      console.error("[CREATE-CHECKOUT] Amount mismatch:", { 
        expected: orderData.total_amount, 
        received: totalAmount,
        difference: amountDifference 
      });
      return new Response(JSON.stringify({ 
        error: "Amount verification failed",
        details: "Order amount does not match database record"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[CREATE-CHECKOUT] Order verified:", { orderId, userId: user.id, amount: totalAmount });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer found:", customerId);
    } else {
      console.log("[CREATE-CHECKOUT] No existing customer, will create during checkout");
    }

    // Create line items for Stripe
    // Calculate sum of individual items to detect ANY price adjustment (discount OR surcharge)
    const itemsTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    
    // Check if there's ANY price adjustment (discount or surcharge like small order fee)
    // Use 0.01 tolerance for floating point rounding
    const hasPriceAdjustment = Math.abs(totalAmount - itemsTotal) > 0.01;
    
    if (hasPriceAdjustment) {
      const adjustmentType = totalAmount < itemsTotal ? 'Discount' : 'Surcharge';
      console.log(`[CREATE-CHECKOUT] ${adjustmentType} detected - using consolidated line item:`, {
        itemsTotal: itemsTotal.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        adjustment: (totalAmount - itemsTotal).toFixed(2),
        type: adjustmentType.toLowerCase(),
        couponCode: couponCode || 'none'
      });
    }
    
    // If ANY price adjustment exists (discount OR surcharge), create a single consolidated line item
    // This ensures cashback, referral discounts, coupons, AND surcharges are all properly reflected in Stripe
    const lineItems = hasPriceAdjustment 
      ? [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Order ${orderNumber}${couponCode ? ` (Code: ${couponCode})` : ''}`,
              description: items.map(item => `${item.name} x${item.quantity}`).join(', '),
            },
            unit_amount: Math.round(totalAmount * 100), // Final total after ALL adjustments in cents
          },
          quantity: 1,
        }]
      : items.map(item => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
          },
          quantity: item.quantity,
        }));

    // Create checkout session
    const origin = req.headers.get("origin") || "https://misti.services";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${origin}/checkout?canceled=true`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        user_id: user.id,
      },
    });

    console.log("[CREATE-CHECKOUT] Checkout session created:", session.id);

    // Log successful checkout session creation
    await supabaseAdmin.rpc("log_security_event", {
      p_function_name: "checkout_session_created",
      p_user_id: user.id,
      p_operation_details: { order_id: orderId, amount: totalAmount },
      p_severity: "info",
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
