import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { hashToken } from "../_shared/tokenHash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ValidateTokenRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token }: ValidateTokenRequest = await req.json();

    if (!token || token.length !== 64) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid token format" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Hash the incoming token to compare against stored hash
    const hashedToken = await hashToken(token);

    // Look up the hashed token
    const { data: tokenData, error } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", hashedToken)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Token lookup error:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Token validation failed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!tokenData) {
      // Log invalid token attempt
      await supabase.rpc("log_security_event", {
        p_function_name: "password_reset_token_invalid",
        p_user_id: null,
        p_operation_details: { token_prefix: token.substring(0, 8) },
        p_severity: "warning",
      });

      return new Response(
        JSON.stringify({ valid: false, error: "Token is invalid or has expired" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Log successful token validation
    await supabase.rpc("log_security_event", {
      p_function_name: "password_reset_token_validated",
      p_user_id: null,
      p_operation_details: { email_domain: tokenData.email.split("@")[1] },
      p_severity: "info",
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        email: tokenData.email 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in validate-reset-token function:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
