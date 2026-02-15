import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WordPress and old content path patterns that should return 410 Gone
const GONE_PATTERNS = [
  /^\/wp-admin(\/.*)?$/,
  /^\/wp-content(\/.*)?$/,
  /^\/wp-includes(\/.*)?$/,
  /^\/category(\/.*)?$/,
  /^\/tag(\/.*)?$/,
  /^\/feed(\/.*)?$/,
  /^\/author(\/.*)?$/,
  /^\/page(\/.*)?$/,
  /^\/old-blog(\/.*)?$/,
  /^\/product(\/.*)?$/,
];

/**
 * Check if a path matches any gone pattern
 */
function isGonePattern(pathname: string): boolean {
  return GONE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Simple in-memory cache with TTL
let cachedRedirects: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limiting: 100 requests per minute per IP
    const clientIP = getClientIP(req);
    const { allowed, remaining } = await checkRateLimit(supabase, clientIP, {
      endpoint: 'get-redirects',
      limit: 100,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60"
        },
      });
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const incrementHit = url.searchParams.get("incrementHit") === "true";
    const checkGone = url.searchParams.get("checkGone") === "true";

    // Return cached redirects if available and not expired
    const now = Date.now();
    if (cachedRedirects && now - cachedRedirects.timestamp < CACHE_TTL_MS && !incrementHit) {
      // If path is provided, find matching redirect
      if (path) {
        const match = findMatchingRedirect(cachedRedirects.data, path);
        
        // Check for gone status if requested
        let isGone = false;
        let goneType = null;
        
        if (checkGone && !match) {
          // Check gone patterns first
          if (isGonePattern(path)) {
            isGone = true;
            goneType = "pattern";
          } else {
            // Check deleted_urls table
            const { data: deletedUrl } = await supabase
              .from("deleted_urls")
              .select("id")
              .eq("url_path", path)
              .maybeSingle();
            
            if (deletedUrl) {
              isGone = true;
              goneType = "deleted";
            }
          }
        }
        
        return new Response(JSON.stringify({ redirect: match, isGone, goneType }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ redirects: cachedRedirects.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active redirects from database
    const { data: redirects, error } = await supabase
      .from("url_redirects")
      .select("id, source_path, destination_path, is_pattern, status_code")
      .eq("is_active", true)
      .order("is_pattern", { ascending: true }); // Exact matches first

    if (error) {
      console.error("Error fetching redirects:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch redirects" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update cache
    cachedRedirects = { data: redirects || [], timestamp: now };

    // If path is provided, find matching redirect
    if (path) {
      const match = findMatchingRedirect(redirects || [], path);
      
      // Check for gone status if requested
      let isGone = false;
      let goneType = null;
      
      if (checkGone && !match) {
        // Check gone patterns first
        if (isGonePattern(path)) {
          isGone = true;
          goneType = "pattern";
        } else {
          // Check deleted_urls table
          const { data: deletedUrl } = await supabase
            .from("deleted_urls")
            .select("id")
            .eq("url_path", path)
            .maybeSingle();
          
          if (deletedUrl) {
            isGone = true;
            goneType = "deleted";
          }
        }
      }
      
      // Increment hit count asynchronously if we found a match
      if (match && incrementHit) {
        // Fire and forget using EdgeRuntime.waitUntil pattern
        (async () => {
          try {
            await supabase.rpc("increment_redirect_hit", { redirect_id: match.id });
          } catch {
            console.error("Failed to increment hit count");
          }
        })();
      }

      return new Response(JSON.stringify({ redirect: match, isGone, goneType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ redirects: redirects || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function findMatchingRedirect(
  redirects: Array<{
    id: string;
    source_path: string;
    destination_path: string;
    is_pattern: boolean;
    status_code: number;
  }>,
  path: string
): { id: string; destination: string; statusCode: number } | null {
  for (const redirect of redirects) {
    if (redirect.is_pattern) {
      try {
        const regex = new RegExp(redirect.source_path);
        if (regex.test(path)) {
          const destination = path.replace(regex, redirect.destination_path);
          return { id: redirect.id, destination, statusCode: redirect.status_code };
        }
      } catch {
        // Invalid regex, skip
        continue;
      }
    } else {
      if (redirect.source_path === path) {
        return { id: redirect.id, destination: redirect.destination_path, statusCode: redirect.status_code };
      }
    }
  }
  return null;
}