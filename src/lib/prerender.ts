// Prerender detection utility
// Detects if the current request is from a prerender bot/crawler
// Enhanced for ostr.io compatibility

const BOT_USER_AGENTS = [
  // Search engine bots
  "googlebot",
  "bingbot",
  "yandex",
  "baiduspider",
  "duckduckbot",
  "yahoo",
  "applebot",

  // Social media bots
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "pinterestbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "viber",
  "skypeuripreview",
  "vkshare",
  "redditbot",
  "tumblr",
  "flipboard",
  "bitlybot",
  "nuzzel",
  "xing-contenttabreceiver",
  "bitrix link preview",

  // AI bots
  "gptbot",
  "chatgpt",
  "chatgpt-user",
  "claude",
  "claudebot",
  "anthropic",
  "perplexitybot",
  "cohere",
  "deepseek",
  "gemini",
  "bard",
  "grok",
  "xai",

  // Prerender services
  "prerender",
  "prerender.io",
  "lovablehtml",
  "page-replica",
  "rendertron",
  "ostr",
  "render.ostr.io",

  // Headless browsers / crawlers
  "headless",
  "phantomjs",
  "puppeteer",
  "chrome-lighthouse",

  // SEO tools
  "rogerbot",
  "embedly",
  "quora link preview",
  "showyoubot",
  "outbrain",
  "qwantify",
  "w3c_validator",
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
  "screaming frog",
];

let cachedIsPrerender: boolean | null = null;

/**
 * Detects if the current request is from a prerender service or crawler bot
 * Results are cached for performance
 */
export const isPrerender = (): boolean => {
  // Return cached result if available
  if (cachedIsPrerender !== null) {
    return cachedIsPrerender;
  }

  // Check for server-side rendering context
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    cachedIsPrerender = true;
    return true;
  }

  // Check for ostr.io's IS_PRERENDERING flag (set by their service)
  if ((window as any).IS_PRERENDERING === true) {
    cachedIsPrerender = true;
    return true;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check if user agent matches any known bot
  cachedIsPrerender = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  // Also check for prerender-specific query parameters
  if (!cachedIsPrerender) {
    const urlParams = new URLSearchParams(window.location.search);
    cachedIsPrerender = urlParams.has("_escaped_fragment_") || urlParams.has("_prerender") || urlParams.has("_ostr");
  }

  // Check for ostr.io specific headers (via referrer)
  if (!cachedIsPrerender && document.referrer) {
    cachedIsPrerender = document.referrer.includes("ostr.io") || document.referrer.includes("render.ostr.io");
  }

  return cachedIsPrerender;
};

/**
 * Verifies that critical SEO meta tags are present.
 * Works for both Next.js server metadata and client-managed updates.
 */
const verifyCriticalMetaTags = (): boolean => {
  if (typeof document === "undefined") return false;

  // Check for title
  const title = document.querySelector("title");
  if (!title || !title.textContent || title.textContent.length < 5) {
    return false;
  }

  // Check for meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription || !metaDescription.getAttribute("content")) {
    return false;
  }

  const currentTitle = title.textContent;
  const currentDesc = metaDescription.getAttribute("content") || "";

  const isHomePage = window.location.pathname === "/" || window.location.pathname === "";

  // Verify OG tags are present
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogTitle || !ogDesc) {
    return false;
  }

  // Verify canonical is present and matches current route
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    return false;
  }

  const canonicalHref = canonical.getAttribute("href") || "";
  const currentPath = window.location.pathname;

  if (!isHomePage) {
    // For non-homepage, canonical should contain the current path
    if (!canonicalHref.includes(currentPath)) {
      return false;
    }
  }

  return true;
};

/**
 * Verifies that structured data (JSON-LD) is present
 */
const verifyStructuredData = (): boolean => {
  if (typeof document === "undefined") return false;

  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  return jsonLdScripts.length > 0;
};

/**
 * Signals to prerender tools that the page content is ready to capture
 * Uses multiple signal methods for maximum compatibility with prerender services
 * Verifies critical meta tags are present before signaling
 *
 * @param options - Configuration options for signaling
 * @param options.timeout - Maximum time to wait for meta tags (default: 8000ms)
 * @param options.requireStructuredData - Whether to wait for JSON-LD (default: false)
 */
export const signalPrerenderReady = (options?: { timeout?: number; requireStructuredData?: boolean }): void => {
  if (typeof window !== "undefined") {
    const { timeout = 8000, requireStructuredData = false } = options || {};
    const maxAttempts = Math.ceil(timeout / 100);
    let attempts = 0;
    let consecutiveSuccesses = 0;
    const startTime = Date.now();

    const checkAndSignal = () => {
      attempts++;

      const metaReady = verifyCriticalMetaTags();
      const structuredDataReady = requireStructuredData ? verifyStructuredData() : true;
      const timeoutReached = attempts >= maxAttempts || Date.now() - startTime > timeout;

      // Require 2 consecutive successful checks to ensure metadata has settled
      if (metaReady && structuredDataReady) {
        consecutiveSuccesses++;
      } else {
        consecutiveSuccesses = 0;
      }

      if (consecutiveSuccesses >= 2 || timeoutReached) {
        // Standard signal used by most prerender services (including LovableHTML/page-replica)
        (window as any).prerenderReady = true;

        // Legacy signal (keep for backward compatibility)
        (window as any).__PRERENDER_READY = true;

        // ostr.io specific signals - CRITICAL for ostr.io to work
        (window as any).prerenderDone = true;
        (window as any).IS_RENDERED = true; // Primary ostr.io signal

        // Add DOM element signal that Puppeteer can detect
        if (!document.querySelector('meta[name="prerender-ready"]')) {
          const readyElement = document.createElement("meta");
          readyElement.setAttribute("name", "prerender-ready");
          readyElement.setAttribute("content", "true");
          document.head.appendChild(readyElement);
        }

        // Dispatch custom event for services that listen for events
        const event = new CustomEvent("prerenderReady", { detail: { ready: true } });
        document.dispatchEvent(event);

        // Also set on document for services that check there
        (document as any).prerenderReady = true;

        // Log for debugging (only visible to bots/prerender services)
        if (isPrerender()) {
          console.log("[Prerender] Page ready signal sent", {
            metaReady,
            structuredDataReady,
            consecutiveSuccesses,
            attempts,
            elapsed: Date.now() - startTime,
          });
        }
      } else {
        // Retry after a short delay to give metadata time to settle
        setTimeout(checkAndSignal, 100);
      }
    };

    checkAndSignal();
  }
};

/**
 * Resets the prerender cache (useful for testing)
 */
export const resetPrerenderCache = (): void => {
  cachedIsPrerender = null;
};

/**
 * Check if the current visitor is a bot/crawler
 * Useful for conditional rendering or data loading
 */
export const isBotVisitor = (): boolean => {
  return isPrerender();
};
