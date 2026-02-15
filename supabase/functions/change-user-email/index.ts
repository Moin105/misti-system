import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChangeEmailRequest {
  currentPassword: string;
  newEmail: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header exists
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub;
    const userEmail = claims.claims.email;

    // Parse request body
    const { currentPassword, newEmail }: ChangeEmailRequest = await req.json();

    // Validate inputs
    if (!currentPassword || !newEmail) {
      return new Response(
        JSON.stringify({ error: "Current password and new email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for logging and rate limiting
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: 5 per hour per user
    const { allowed } = await checkRateLimit(adminClient, userId as string, {
      endpoint: 'change-user-email',
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the attempt
    await adminClient.rpc("log_security_event", {
      p_function_name: "change_user_email_attempt",
      p_user_id: userId,
      p_operation_details: { new_email: newEmail },
    });

    // CRITICAL: Re-authenticate the user with their current password
    // This ensures they actually know their password before allowing email change
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: userEmail as string,
      password: currentPassword,
    });

    if (signInError || !signInData.user) {
      // Log failed password verification
      await adminClient.rpc("log_security_event", {
        p_function_name: "change_user_email_failed",
        p_user_id: userId,
        p_operation_details: { reason: "invalid_password" },
      });

      return new Response(
        JSON.stringify({ error: "Current password is incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password verified - now update the email using admin client
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (updateError) {
      await adminClient.rpc("log_security_event", {
        p_function_name: "change_user_email_error",
        p_user_id: userId,
        p_operation_details: { error: updateError.message },
      });

      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also update the email in profiles table
    await adminClient
      .from("profiles")
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq("id", userId);

    // Log success
    await adminClient.rpc("log_security_event", {
      p_function_name: "change_user_email_success",
      p_user_id: userId,
      p_operation_details: { old_email: userEmail, new_email: newEmail },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email updated successfully. Please check your new email for confirmation." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in change-user-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
