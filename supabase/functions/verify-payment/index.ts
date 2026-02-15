import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[VERIFY-PAYMENT] Function started");

    // Authenticate user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[VERIFY-PAYMENT] Authentication failed:", authError);
      throw new Error("Unauthorized: Invalid token");
    }

    console.log("[VERIFY-PAYMENT] Authenticated user:", user.id);

    // Rate limit: 20 verifications per hour per user
    const rateLimit = await checkRateLimit(supabaseClient, user.id, {
      endpoint: 'verify_payment',
      limit: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimit.allowed) {
      // Log rate limit
      await supabaseClient.rpc("log_security_event", {
        p_function_name: "payment_verification_rate_limited",
        p_user_id: user.id,
        p_operation_details: {},
        p_severity: "warning",
      });

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
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

    const { sessionId, orderId } = await req.json();
    if (!sessionId || !orderId) {
      throw new Error("Missing sessionId or orderId");
    }

    // Verify order ownership and fetch order data including referral info
    const { data: order, error: orderFetchError } = await supabaseClient
      .from("orders")
      .select("user_id, status, cashback_used, cashback_earned, total_amount, coupon_id, coupon_discount, referrer_id, referral_discount")
      .eq("id", orderId)
      .single();

    if (orderFetchError || !order) {
      console.error("[VERIFY-PAYMENT] Error fetching order:", orderFetchError);
      throw new Error("Order not found");
    }

    // Critical: Verify the order belongs to the authenticated user
    if (order.user_id !== user.id) {
      console.error("[VERIFY-PAYMENT] Unauthorized access attempt by user:", user.id, "for order owned by:", order.user_id);
      
      // Log unauthorized access attempt
      await supabaseClient.rpc("log_security_event", {
        p_function_name: "payment_verification_unauthorized",
        p_user_id: user.id,
        p_operation_details: { attempted_order_id: orderId },
        p_severity: "error",
      });

      throw new Error("Unauthorized: Order does not belong to user");
    }

    // IDEMPOTENCY CHECK: If order is already processing or completed, skip all processing
    if (order.status === 'completed' || order.status === 'processing') {
      console.log("[VERIFY-PAYMENT] Order already processed, skipping:", orderId, "status:", order.status);
      return new Response(JSON.stringify({
        success: true, 
        paymentStatus: "paid",
        orderStatus: order.status,
        alreadyProcessed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PAYMENT] Session retrieved:", session.id, "Status:", session.payment_status);

    if (session.payment_status === "paid") {
      // Process cashback atomically (order already verified above)
      const { error: cashbackError } = await supabaseClient.rpc(
        "process_order_cashback",
        {
          p_user_id: order.user_id,
          p_order_id: orderId,
          p_cashback_used: order.cashback_used,
          p_cashback_earned: order.cashback_earned,
          p_order_amount: order.total_amount,
        }
      );

      if (cashbackError) {
        console.error("[VERIFY-PAYMENT] Error processing cashback:", cashbackError);
        throw cashbackError;
      }

      console.log("[VERIFY-PAYMENT] Cashback processed successfully");

      // Process referral reward if this order has a referrer
      if (order.referrer_id) {
        try {
          console.log("[VERIFY-PAYMENT] Processing referral reward for referrer:", order.referrer_id);
          
          // SAFETY: Ensure referred_by is set (in case checkout didn't set it)
          const { error: profileUpdateError } = await supabaseClient
            .from("profiles")
            .update({ referred_by: order.referrer_id })
            .eq("id", order.user_id)
            .is("referred_by", null); // Only update if not already set
          
          if (profileUpdateError) {
            console.log("[VERIFY-PAYMENT] referred_by update note:", profileUpdateError.message);
          }
          
          // Use RPC to process referral reward atomically
          // Pass referrer_id as fallback in case referred_by lookup fails
          const { data: referralResult, error: referrerCashbackError } = await supabaseClient.rpc(
            "process_referral_reward",
            {
              p_order_id: orderId,
              p_referee_id: order.user_id,
              p_order_amount: order.total_amount,
              p_referrer_id: order.referrer_id, // Fallback referrer ID
            }
          );

          if (referrerCashbackError) {
            console.error("[VERIFY-PAYMENT] Referral reward error:", referrerCashbackError);
          } else {
            console.log("[VERIFY-PAYMENT] Referral reward result:", JSON.stringify(referralResult));
          }

          // Record the referral transaction (RPC already does this, but upsert as backup)
          if (referralResult?.processed) {
            const { error: transactionError } = await supabaseClient
              .from("referral_transactions")
              .upsert({
                referrer_id: order.referrer_id,
                referee_id: order.user_id,
                order_id: orderId,
                reward_amount: referralResult.reward_amount,
                referee_discount: order.referral_discount,
                status: "completed",
              }, {
                onConflict: "referee_id,referrer_id"
              });

            if (transactionError) {
              console.error("[VERIFY-PAYMENT] Referral transaction backup record error:", transactionError);
            }
          }
        } catch (referralErr) {
          console.error("[VERIFY-PAYMENT] Referral processing exception:", referralErr);
        }
      } else {
        console.log("[VERIFY-PAYMENT] No referrer on this order, skipping referral reward");
      }

      // Record coupon usage if applicable
      if (order.coupon_id) {
        console.log("[VERIFY-PAYMENT] Recording coupon usage:", order.coupon_id);
        
        // Insert into coupon_usage table (upsert to prevent duplicates)
        const { error: couponUsageError } = await supabaseClient
          .from("coupon_usage")
          .upsert({
            coupon_id: order.coupon_id,
            order_id: orderId,
            user_id: order.user_id,
            discount_amount: order.coupon_discount
          }, {
            onConflict: 'order_id'
          });

        if (couponUsageError) {
          console.error("[VERIFY-PAYMENT] Error recording coupon usage:", couponUsageError);
        }
        
        // Increment coupon usage counter
        const { error: couponIncrementError } = await supabaseClient.rpc("apply_coupon_usage", {
          p_coupon_id: order.coupon_id
        });

        if (couponIncrementError) {
          console.error("[VERIFY-PAYMENT] Error incrementing coupon usage:", couponIncrementError);
        } else {
          console.log("[VERIFY-PAYMENT] Coupon usage recorded successfully");
        }
      }

      // Update order status to processing (not completed - admin will mark as completed)
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "processing",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("[VERIFY-PAYMENT] Error updating order:", updateError);
        throw updateError;
      }

      console.log("[VERIFY-PAYMENT] Order updated to processing:", orderId);

      // Send order notification email
      try {
        console.log("[VERIFY-PAYMENT] Sending order notification email...");
        
        const notificationResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-order-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader,
            },
            body: JSON.stringify({
              orderId: orderId,
              type: "paid",
            }),
          }
        );
        
        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text();
          console.error("[VERIFY-PAYMENT] Order notification failed:", errorText);
        } else {
          console.log("[VERIFY-PAYMENT] Order notification email sent successfully");
        }
      } catch (notificationError) {
        console.error("[VERIFY-PAYMENT] Error sending order notification:", notificationError);
      }

      // Log successful payment verification
      await supabaseClient.rpc("log_security_event", {
        p_function_name: "payment_verified",
        p_user_id: user.id,
        p_operation_details: { order_id: orderId, amount: order.total_amount },
        p_severity: "success",
      });

      return new Response(JSON.stringify({
        success: true, 
        paymentStatus: "paid",
        orderStatus: "processing"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Log failed payment
      await supabaseClient.rpc("log_security_event", {
        p_function_name: "payment_verification_failed",
        p_user_id: user.id,
        p_operation_details: { order_id: orderId, payment_status: session.payment_status },
        p_severity: "warning",
      });

      console.log("[VERIFY-PAYMENT] Payment not completed:", session.payment_status);
      return new Response(JSON.stringify({ 
        success: false, 
        paymentStatus: session.payment_status 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("[VERIFY-PAYMENT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
