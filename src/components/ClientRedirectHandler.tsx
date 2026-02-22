import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "@/lib/env";

// Cache redirects list to avoid repeated API calls
let cachedRedirects: RedirectRule[] | null = null;
let cachedRedirectsAt = 0;
let redirectsFetchPromise: Promise<RedirectRule[]> | null = null;
const REDIRECT_CACHE_TTL_MS = 30 * 1000; // 30s so admin updates reflect quickly

// Routes that should NEVER trigger redirect checks (performance optimization)
const SKIP_REDIRECT_PREFIXES = [
  "/game/",      // Valid app routes - checked by Services/ProductDetail pages
  "/order/",     // Valid app route
  "/blog/",      // Valid app route
  "/admin",      // Admin panel
  "/auth",       // Auth pages
  "/checkout",   // Checkout
  "/account",    // Account page
];

const SKIP_EXACT_ROUTES = new Set([
  "/",
  "/payment-success",
  "/orders",
  "/sitemap-generator",
  "/sitemap",
  "/work-with-us",
  "/about-us",
  "/contact-us",
  "/gone",
  "/forbidden",
]);

/**
 * ClientRedirectHandler
 * 
 * Handles legacy URL redirects for paths that don't match current routes.
 * SKIPS all /game/* routes since those are handled by the app itself.
 */
export default function ClientRedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const checkRedirect = async () => {
      const pathname = location.pathname;

      // Skip if already checking
      if (isCheckingRef.current) {
        return;
      }

      // Skip exact match routes
      if (SKIP_EXACT_ROUTES.has(pathname)) {
        return;
      }

      // Skip routes by prefix (game, order, blog, admin, etc.)
      if (SKIP_REDIRECT_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return;
      }

      isCheckingRef.current = true;

      try {
        // Get redirects (cached or fetch once)
        let redirects = await getRedirects();
        
        // Find a matching redirect
        let match = findMatchingRedirect(redirects, pathname);

        // If not found, force refresh once to pick up newly created redirect rules immediately.
        if (!match) {
          redirects = await getRedirects(true);
          match = findMatchingRedirect(redirects, pathname);
        }

        if (match) {
          // Increment hit count asynchronously (fire and forget)
          incrementHitCount(pathname);

          // Perform the redirect
          const destination = match.destination;
          
          if (destination.startsWith("http://") || destination.startsWith("https://")) {
            window.location.replace(destination);
          } else {
            window.location.replace(window.location.origin + destination);
          }
          return;
        }

        // No redirect found - check if it's a "gone" page in a single call
        const goneCheckUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-redirects?path=${encodeURIComponent(pathname)}&checkGone=true`;
        const goneResponse = await fetch(goneCheckUrl, {
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        
        if (goneResponse.ok) {
          const goneData = await goneResponse.json();
          if (goneData.isGone) {
            navigate('/gone', { replace: true });
            return;
          }
        }

      } catch (error) {
        console.error("Redirect check error:", error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkRedirect();
  }, [location.pathname, navigate]);

  return null;
}

// Fetch redirects once and cache
async function getRedirects(forceRefresh = false): Promise<RedirectRule[]> {
  const cacheValid =
    cachedRedirects &&
    Date.now() - cachedRedirectsAt < REDIRECT_CACHE_TTL_MS;

  if (!forceRefresh && cacheValid) {
    return cachedRedirects;
  }

  // Dedupe concurrent requests
  if (redirectsFetchPromise) {
    return redirectsFetchPromise;
  }

  redirectsFetchPromise = fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-redirects`,
    {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
    }
  )
    .then(res => res.json())
    .then(data => {
      cachedRedirects = data?.redirects || [];
      cachedRedirectsAt = Date.now();
      redirectsFetchPromise = null;
      return cachedRedirects;
    })
    .catch(() => {
      redirectsFetchPromise = null;
      return [];
    });

  return redirectsFetchPromise;
}

// Fire-and-forget hit count increment
function incrementHitCount(pathname: string) {
  fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-redirects?path=${encodeURIComponent(pathname)}&incrementHit=true`,
    {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  ).catch(() => {});
}

interface RedirectRule {
  id: string;
  source_path: string;
  destination_path: string;
  is_pattern: boolean;
  status_code: number;
  // Note: is_active is not included - server already filters to active only
}

function findMatchingRedirect(
  redirects: RedirectRule[],
  path: string
): { id: string; destination: string; statusCode: number } | null {
  for (const redirect of redirects) {
    // All redirects from API are already active (filtered server-side)

    if (redirect.is_pattern) {
      try {
        const regex = new RegExp(redirect.source_path);
        if (regex.test(path)) {
          let destination = path.replace(regex, redirect.destination_path);
          // Remove any unmatched capture group placeholders ($1, $2, etc.)
          destination = destination.replace(/\$\d+/g, '');
          return {
            id: redirect.id,
            destination,
            statusCode: redirect.status_code,
          };
        }
      } catch {
        // Invalid regex, skip this redirect
        continue;
      }
    } else {
      // Exact match
      if (redirect.source_path === path) {
        return {
          id: redirect.id,
          destination: redirect.destination_path,
          statusCode: redirect.status_code,
        };
      }
    }
  }

  return null;
}
