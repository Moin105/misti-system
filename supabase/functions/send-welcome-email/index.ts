import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIP } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 5 welcome emails per IP per hour
const RATE_LIMIT_CONFIG = {
  endpoint: 'send-welcome-email',
  limit: 5,
  windowMs: 60 * 60 * 1000 // 1 hour
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const clientIP = getClientIP(req);
    const { allowed, remaining } = await checkRateLimit(supabase, clientIP, RATE_LIMIT_CONFIG);

    if (!allowed) {
      console.warn(`[WELCOME-EMAIL] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "X-RateLimit-Remaining": "0",
            ...corsHeaders 
          } 
        }
      );
    }

    const { email, name }: WelcomeEmailRequest = await req.json();

    if (!email) {
      console.error("[WELCOME-EMAIL] Email is required");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      console.error("[WELCOME-EMAIL] Invalid email format");
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[WELCOME-EMAIL] Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "Misti Boosting <support@misti.services>",
      to: [email],
      subject: "Welcome to Misti Boosting! 🎮",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
              .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; text-align: center; }
              .content { background: white; border-radius: 8px; padding: 30px; margin-top: 20px; }
              h1 { color: white; margin: 0 0 20px 0; font-size: 28px; }
              .emoji { font-size: 48px; margin-bottom: 20px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
              .features { text-align: left; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
              .feature { margin: 10px 0; padding-left: 25px; position: relative; }
              .feature::before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
              .footer { margin-top: 30px; color: rgba(255,255,255,0.8); font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Welcome to Misti Boosting!</h1>
              <div class="content">
                <div class="emoji">🎮</div>
                <p style="font-size: 18px; margin-bottom: 20px;">Hey ${name || 'there'}!</p>
                <p style="font-size: 16px; margin-bottom: 20px;">Thank you for creating an account with us. We're excited to have you on board!</p>
                
                <div class="features">
                  <p style="font-weight: 600; margin-bottom: 15px;">What you can do now:</p>
                  <div class="feature">Browse our premium gaming services</div>
                  <div class="feature">Earn cashback on every purchase</div>
                  <div class="feature">Track your orders in real-time</div>
                  <div class="feature">Get exclusive member discounts</div>
                </div>
                
                <a href="https://misti.services" class="button">Start Shopping</a>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Need help? Our support team is available 24/7 via Discord or email.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Misti Boosting. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if ((emailResponse as any)?.error) {
      const resendError = (emailResponse as any).error;
      const message =
        typeof resendError?.message === "string"
          ? resendError.message
          : "Failed to send welcome email";
      console.error("[WELCOME-EMAIL] Resend API error:", resendError);
      return new Response(
        JSON.stringify({ error: message, providerError: resendError }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("[WELCOME-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { 
        "Content-Type": "application/json", 
        "X-RateLimit-Remaining": String(remaining),
        ...corsHeaders 
      },
    });
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
