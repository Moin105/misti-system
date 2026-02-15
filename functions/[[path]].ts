// Cloudflare Pages Function for handling redirects
// This runs at the edge before serving any content

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface RedirectResponse {
  redirect: {
    id: string;
    destination: string;
    statusCode: number;
  } | null;
}

// Cache for redirect matches - shorter TTL for misses
interface CacheEntry {
  data: RedirectResponse | null;
  timestamp: number;
  path: string;
}

let redirectCache: CacheEntry | null = null;
const CACHE_HIT_TTL_MS = 60 * 1000; // 1 minute for matches
const CACHE_MISS_TTL_MS = 5 * 1000; // 5 seconds for misses (so new redirects work quickly)

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip redirect check for static assets and API routes
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/assets") ||
    path.startsWith("/images") ||
    path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map|json)$/)
  ) {
    return next();
  }

  try {
    const now = Date.now();
    
    // Check cache - use appropriate TTL based on whether we had a hit or miss
    if (redirectCache && redirectCache.path === path) {
      const cacheTtl = redirectCache.data?.redirect ? CACHE_HIT_TTL_MS : CACHE_MISS_TTL_MS;
      if (now - redirectCache.timestamp < cacheTtl) {
        if (redirectCache.data?.redirect) {
          const { destination, statusCode } = redirectCache.data.redirect;
          const redirectUrl = destination.startsWith("http")
            ? destination
            : new URL(destination, url.origin).toString();
          
          return new Response(null, {
            status: statusCode,
            headers: { 
              Location: redirectUrl,
              "x-redirect-middleware": "1",
              "x-redirect-source": "cache",
            },
          });
        }
        // Cache miss - pass through with debug header
        const response = await next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set("x-redirect-middleware", "1");
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      }
    }

    // Get Supabase URL and key from environment or use defaults
    const supabaseUrl = env.SUPABASE_URL || "https://kdjlhibxxygfdmlvdfcl.supabase.co";
    const supabaseKey = env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkamxoaWJ4eHlnZmRtbHZkZmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzkxOTMsImV4cCI6MjA3NTAxNTE5M30.yzK3OTDrA-whQuTyOnth8j0SjY2MrodfjUDBojzgL6I";

    // Query the edge function for redirect
    const redirectCheckUrl = `${supabaseUrl}/functions/v1/get-redirects?path=${encodeURIComponent(path)}&incrementHit=true`;
    
    const response = await fetch(redirectCheckUrl, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Redirect check failed: ${response.status}`);
      const passResponse = await next();
      const newHeaders = new Headers(passResponse.headers);
      newHeaders.set("x-redirect-middleware", "1");
      newHeaders.set("x-redirect-error", "fetch-failed");
      return new Response(passResponse.body, {
        status: passResponse.status,
        headers: newHeaders,
      });
    }

    const data: RedirectResponse = await response.json();
    
    // Update cache
    redirectCache = { data, timestamp: now, path };

    if (data.redirect) {
      const { destination, statusCode } = data.redirect;
      
      // Handle relative vs absolute URLs
      const redirectUrl = destination.startsWith("http")
        ? destination
        : new URL(destination, url.origin).toString();

      return new Response(null, {
        status: statusCode,
        headers: { 
          Location: redirectUrl,
          "x-redirect-middleware": "1",
          "x-redirect-source": "fresh",
        },
      });
    }

    // No redirect found, continue to the app with debug header
    const passResponse = await next();
    const newHeaders = new Headers(passResponse.headers);
    newHeaders.set("x-redirect-middleware", "1");
    return new Response(passResponse.body, {
      status: passResponse.status,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("Redirect middleware error:", error);
    // On error, continue to the app with debug header
    const passResponse = await next();
    const newHeaders = new Headers(passResponse.headers);
    newHeaders.set("x-redirect-middleware", "1");
    newHeaders.set("x-redirect-error", "exception");
    return new Response(passResponse.body, {
      status: passResponse.status,
      headers: newHeaders,
    });
  }
};