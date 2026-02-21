// Service Worker for caching static assets and API responses
// IMPORTANT: Increment this version on each deploy to bust caches
const SW_VERSION = '2025-02-12-v1';
const CACHE_NAME = `misti-static-${SW_VERSION}`;
const API_CACHE_NAME = `misti-api-${SW_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Bot user agents - skip caching for prerender services
const BOT_AGENTS = [
  'googlebot', 'bingbot', 'prerender', 'lovablehtml', 'page-replica',
  'headless', 'phantomjs', 'lighthouse', 'rendertron', 'puppeteer',
  'facebookexternalhit', 'twitterbot', 'discordbot', 'whatsapp',
  'telegrambot', 'linkedinbot', 'slackbot', 'applebot', 'yandex',
  'baiduspider', 'ostr', 'render.ostr.io', 'gptbot', 'chatgpt',
  'claudebot', 'perplexitybot'
];

// Supabase API base URL for predictive caching
const SUPABASE_URL = 'https://sclvjrnnnbbptnhonoks.supabase.co';

// API endpoints to cache with their TTL in seconds
const API_CACHE_CONFIG = {
  // Critical initial page data
  '/rest/v1/games': 300, // 5 minutes
  '/rest/v1/global_review_config': 600, // 10 minutes
  '/rest/v1/exchange_rates': 1800, // 30 minutes
  '/rest/v1/cookie_banner_config': 1800, // 30 minutes
  
  // Products and categories
  '/rest/v1/products': 300, // 5 minutes
  '/rest/v1/categories': 600, // 10 minutes
  '/rest/v1/product_trust_badges': 1800, // 30 minutes
  '/rest/v1/product_faqs': 600, // 10 minutes
  '/rest/v1/product_options': 300, // 5 minutes
  '/rest/v1/product_rewards': 600, // 10 minutes
  
  
  // UI configuration
  '/rest/v1/review_platforms': 1800, // 30 minutes
  '/rest/v1/service_highlights': 1800, // 30 minutes
  '/rest/v1/cashback_tiers': 600, // 10 minutes
  
  // Footer data
  '/rest/v1/footer_sections': 600, // 10 minutes
  '/rest/v1/footer_links': 600, // 10 minutes
  '/rest/v1/social_links': 600, // 10 minutes
  
  // How it works
  '/rest/v1/how_it_works_steps': 1800, // 30 minutes
  '/rest/v1/how_it_works_showcase': 1800, // 30 minutes
  
  // Why we features
  '/rest/v1/why_we_features': 1800, // 30 minutes
};

// Check if request is from a bot
function isBot(request) {
  const userAgent = request.headers.get('User-Agent')?.toLowerCase() || '';
  return BOT_AGENTS.some(bot => userAgent.includes(bot));
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const oldCaches = cacheNames.filter(
        (name) =>
          name.startsWith('misti-') &&
          name !== CACHE_NAME &&
          name !== API_CACHE_NAME
      );

      return Promise.all(oldCaches.map((name) => caches.delete(name))).then(() => {
        // Only notify clients if we actually removed old caches (true update).
        // On first install, there are no old caches; notifying would cause app code
        // to think an "update" happened and potentially reload.
        if (oldCaches.length === 0) return;

        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
          });
        });
      });
    })
  );
  self.clients.claim();
});

// Check if URL matches any cacheable API endpoint
function getCacheableEndpoint(url) {
  for (const endpoint of Object.keys(API_CACHE_CONFIG)) {
    if (url.pathname.includes(endpoint)) {
      return { endpoint, ttl: API_CACHE_CONFIG[endpoint] };
    }
  }
  return null;
}

// Predictive caching: when a game page is fetched, prefetch related data
async function prefetchRelatedGameData(gameSlug, apiKey) {
  try {
    const headers = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    };

    // First get the game to find its ID
    const gameRes = await fetch(
      `${SUPABASE_URL}/rest/v1/games?slug=eq.${gameSlug}&is_active=eq.true&select=id`,
      { headers }
    );
    
    if (!gameRes.ok) return;
    
    const games = await gameRes.json();
    if (!games || games.length === 0) return;
    
    const gameId = games[0].id;
    
    // Prefetch categories for this game (fire and forget)
    fetch(
      `${SUPABASE_URL}/rest/v1/categories?game_id=eq.${gameId}&is_active=eq.true&order=sort_order.asc&select=id`,
      { headers }
    ).then(async (res) => {
      if (res.ok) {
        // Clone response for caching
        const clonedRes = res.clone();
        
        // Parse the original response to get category IDs
        const categories = await res.json();
        
        // Cache the categories response
        const cache = await caches.open(API_CACHE_NAME);
        const newHeaders = new Headers(clonedRes.headers);
        newHeaders.set('sw-cached-at', Date.now().toString());
        const body = await clonedRes.text();
        cache.put(clonedRes.url, new Response(body, {
          status: clonedRes.status,
          statusText: clonedRes.statusText,
          headers: newHeaders,
        }));
        
        // Now fetch products using the category IDs
        if (categories && categories.length > 0) {
          // Extract category IDs and format for PostgREST in.() filter
          const categoryIds = categories.map(cat => cat.id).join(',');
          
          // Prefetch first page of products for these categories
          // Use proper PostgREST syntax: category_id=in.(id1,id2,id3)
          fetch(
            `${SUPABASE_URL}/rest/v1/products?category_id=in.(${categoryIds})&is_active=eq.true&order=sort_order.asc&limit=12`,
            { headers }
          ).then(async (productsRes) => {
            if (productsRes.ok) {
              const productsCache = await caches.open(API_CACHE_NAME);
              const productsClonedRes = productsRes.clone();
              const productsNewHeaders = new Headers(productsClonedRes.headers);
              productsNewHeaders.set('sw-cached-at', Date.now().toString());
              const productsBody = await productsClonedRes.text();
              productsCache.put(productsRes.url, new Response(productsBody, {
                status: productsClonedRes.status,
                statusText: productsClonedRes.statusText,
                headers: productsNewHeaders,
              }));
            }
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  } catch (e) {
    // Silently fail - this is just optimization
  }
}

// Extract game slug from URL if it's a game-specific request
function extractGameSlugFromUrl(url) {
  const match = url.search.match(/slug=eq\.([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Check if cached response is still valid
function isCacheValid(response, ttl) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return false;
  const age = (Date.now() - parseInt(cachedAt)) / 1000;
  return age < ttl;
}

// Check if the request originated from an admin page
// Uses request.referrer (string property) which is more reliable than headers
function isAdminRequest(request) {
  // Check the referrer property (not header) - this is the actual document URL
  const referrer = request.referrer;
  if (referrer && referrer.includes('/admin')) {
    return true;
  }
  return false;
}

// Fetch event - cache-first for images/fonts, stale-while-revalidate for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cache API only supports http/https requests. Ignore browser extension schemes.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // CRITICAL: Skip ALL caching for bot/prerender requests
  // This ensures prerender services get fresh, complete HTML
  if (isBot(request)) {
    return; // Let request go directly to network
  }

  // CRITICAL: Skip ALL caching for admin panel requests
  // Admin must always see fresh data for real-time updates
  if (isAdminRequest(request)) {
    return; // Let the request go directly to network
  }

  // Handle navigation requests - serve offline page if network fails
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Handle Supabase API requests with stale-while-revalidate
  if (url.hostname.includes('supabase')) {
    const cacheConfig = getCacheableEndpoint(url);
    if (cacheConfig) {
      event.respondWith(
        caches.open(API_CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          
          // If we have a valid cached response, use it and revalidate in background
          if (cachedResponse && isCacheValid(cachedResponse, cacheConfig.ttl)) {
            // Revalidate in background using clone + text (more efficient than blob)
            fetch(request).then(async (networkResponse) => {
              if (networkResponse.ok) {
                const clonedRes = networkResponse.clone();
                const newHeaders = new Headers(clonedRes.headers);
                newHeaders.set('sw-cached-at', Date.now().toString());
                const body = await clonedRes.text();
                cache.put(request, new Response(body, {
                  status: clonedRes.status,
                  statusText: clonedRes.statusText,
                  headers: newHeaders,
                }));
              }
            }).catch(() => {});
            
            return cachedResponse;
          }
          
          // No valid cache, fetch from network
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const clonedRes = networkResponse.clone();
              const newHeaders = new Headers(clonedRes.headers);
              newHeaders.set('sw-cached-at', Date.now().toString());
              const body = await clonedRes.text();
              cache.put(request, new Response(body, {
                status: clonedRes.status,
                statusText: clonedRes.statusText,
                headers: newHeaders,
              }));
            }
            // Predictive caching: if this is a game request, prefetch related data
            if (url.pathname.includes('/games') && networkResponse.ok) {
              const gameSlug = extractGameSlugFromUrl(url);
              const apiKey = request.headers.get('apikey');
              if (gameSlug && apiKey) {
                // Run in background without blocking response
                prefetchRelatedGameData(gameSlug, apiKey);
              }
            }
            
            return networkResponse;
          } catch (error) {
            // Network failed, return stale cache if available
            if (cachedResponse) return cachedResponse;
            throw error;
          }
        })
      );
      return;
    }
    return; // Skip other Supabase requests
  }

  // Skip googleapis
  if (url.hostname.includes('googleapis')) {
    return;
  }

  // Cache-first for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        
        return fetch(request).then((response) => {
          // Only cache successful FULL responses (not 206 partial content)
          if (!response.ok || response.status === 206) return response;
          
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        }).catch(() => {
          // Return placeholder on network failure
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Cache-first for fonts
  if (request.destination === 'font' || url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        
        return fetch(request).then((response) => {
          // Skip caching 206 partial responses
          if (!response.ok || response.status === 206) return response;
          
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Cache-first for JS/CSS assets (hashed filenames = immutable)
  if ((request.destination === 'script' || request.destination === 'style') && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        
        return fetch(request).then((response) => {
          // Skip caching 206 partial responses
          if (!response.ok || response.status === 206) return response;
          
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }
});
