import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIP } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Whitelist of allowed event types (prevents arbitrary logging)
const ALLOWED_EVENTS = new Set([
  // Authentication events
  'login_success', 'login_failed', 'logout',
  'signup_success', 'signup_failed',
  'login_mfa_required',
  
  // MFA events
  'mfa_enrollment_started', 'mfa_enrollment_verified', 
  'mfa_enrollment_cancelled', 'mfa_verification_success',
  'mfa_verification_failed', 'mfa_disabled',
  
  // Password events
  'password_changed', 'password_change_failed',
  'password_reset_requested',
  
  // Account events
  'account_closure_requested',
  'email_change_success', 'email_change_failed',
]);

interface SecurityEventRequest {
  eventName: string;
  details?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'error' | 'success';
  userId?: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP for rate limiting
    const clientIP = getClientIP(req);

    // Rate limiting: 100 events per hour per IP
    const rateLimitResult = await checkRateLimit(supabase, clientIP, {
      endpoint: "log-security-event",
      limit: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      console.warn("[LOG-SECURITY-EVENT] Rate limit exceeded for IP:", clientIP);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body: SecurityEventRequest = await req.json();
    const { eventName, details = {}, severity, userId, userAgent } = body;

    // Validate event name against whitelist
    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      console.warn("[LOG-SECURITY-EVENT] Invalid event name:", eventName);
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a unique request ID for tracing
    const requestId = crypto.randomUUID();

    // Log the security event using the database function
    const { error: logError } = await supabase.rpc("log_security_event", {
      p_function_name: eventName,
      p_user_id: userId || null,
      p_operation_details: details,
      p_severity: severity || null,
      p_event_category: null, // Auto-detected by the function
      p_request_id: requestId,
      p_user_agent: userAgent || req.headers.get("user-agent") || null,
      p_error_code: null,
      p_error_message: null,
    });

    if (logError) {
      console.error("[LOG-SECURITY-EVENT] Failed to log event:", logError);
      // Don't expose internal errors, but still return success to client
      // The event may have been logged partially
    }

    console.log("[LOG-SECURITY-EVENT] Event logged:", eventName, "User:", userId || "anonymous");

    return new Response(
      JSON.stringify({ success: true, requestId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("[LOG-SECURITY-EVENT] Error:", error);
    // Always return success to client - security logging should be transparent
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
