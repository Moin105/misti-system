import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { checkRateLimit, getClientIP } from "../_shared/rateLimit.ts";
import { hashToken } from "../_shared/tokenHash.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate a secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting: 5 requests per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIP, {
      endpoint: "send-password-reset",
      limit: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      // Log rate limit hit
      await supabase.rpc("log_security_event", {
        p_function_name: "password_reset_rate_limited",
        p_user_id: null,
        p_operation_details: { ip_prefix: clientIP.substring(0, 8) },
        p_severity: "warning",
      });

      return new Response(
        JSON.stringify({ 
          error: "Too many password reset requests. Please try again later.",
          retryAfter: "1 hour"
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email }: PasswordResetRequest = await req.json();

    // Validate email format
    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email length
    if (email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Email address is too long" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user exists by querying profiles table
    // This avoids pagination issues with listUsers() which defaults to 50 users
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
    }

    const userExists = !!profileData?.id;
    
    if (!userExists) {
      // Log invalid email attempt (for security monitoring, not exposing to user)
      await supabase.rpc("log_security_event", {
        p_function_name: "password_reset_invalid_email",
        p_user_id: null,
        p_operation_details: { email_domain: email.split("@")[1] },
        p_severity: "info",
      });

      // Still return success to prevent email enumeration
      console.log("Password reset requested for non-existent email:", email);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate secure token
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Clean up old tokens for this email
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", email.toLowerCase());

    // Hash token before storing (defense-in-depth: raw token never stored)
    const hashedToken = await hashToken(token);

    // Store the hashed token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        email: email.toLowerCase(),
        token: hashedToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to store reset token:", insertError);
      throw new Error("Failed to generate reset token");
    }

    // Build the reset URL
    const resetUrl = `https://misti.services/reset-password?token=${token}`;

    console.log("Sending password reset email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Support <support@misti.services>",
      to: [email],
      subject: "Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; }
              .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; }
              h1 { color: white; margin: 0 0 20px 0; font-size: 28px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Password Reset Request</h1>
              <div class="content">
                <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password for your Misti Boosting account.</p>
                <p style="font-size: 16px; margin-bottom: 20px;">Click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't request a password reset, you can safely ignore this email.</p>
                <p style="font-size: 14px; color: #666;">This link will expire in 1 hour for security reasons.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Misti Boosting. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    // Log successful password reset request
    await supabase.rpc("log_security_event", {
      p_function_name: "password_reset_requested",
      p_user_id: profileData?.id || null,
      p_operation_details: { email_domain: email.split("@")[1] },
      p_severity: "info",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
