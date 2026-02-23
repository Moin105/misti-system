import type { Metadata } from "next";
import { resolveRoute } from "@/lib/nextRoutes";

const SITE_NAME = "misti.services";
const SITE_URL = "https://misti.services";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/dATtYjrZg8XQKUHNOV3bqcwDO6T2/social-images/social-1760973850614-favicon%20png.png";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY;

function humanize(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function withCanonical(pathname: string) {
  return pathname === "/" ? SITE_URL : `${SITE_URL}${pathname}`;
}

function toAbsoluteUrl(value?: string | null): string | null {
  if (!value) return null;
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

async function fetchFromSupabase<T>(table: string, select: string, filters: string[]): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  const query = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&${filters.join("&")}&limit=1`;
  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as T[];
  return rows?.[0] ?? null;
}

function baseMetadata(pathname: string, title: string, description: string): Metadata {
  const canonical = withCanonical(pathname);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@mistiservices",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

const noIndex: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function buildMetadataForPath(pathname: string): Metadata {
  const resolved = resolveRoute(pathname);
  if (!resolved) {
    return {
      ...baseMetadata(
        pathname,
        "404 - Page Not Found | misti.services",
        "The page you're looking for doesn't exist or has been moved. Return to our homepage to find what you need.",
      ),
      robots: noIndex,
    };
  }

  switch (resolved.key) {
    case "index":
      return baseMetadata(
        pathname,
        "WoW & MMO Boost Services | misti.services - Trusted Since 2013",
        "Professional WoW, Path of Exile 2 & Diablo IV boosting services. Fast power leveling, raid carries & PvP boosts since 2013. Safe & secure delivery.",
      );
    case "services": {
      const game = humanize(resolved.params.gameSlug ?? "Game");
      const category = resolved.params.categorySlug ? humanize(resolved.params.categorySlug) : "";
      const title = category
        ? `${game} - ${category} Services | misti.services`
        : `${game} Services | misti.services`;
      const description = category
        ? `Professional ${category} services for ${game}. Trusted boost services with fast delivery and safe methods.`
        : `Browse all ${game} boost services. Professional gaming services with 24/7 support and guaranteed results.`;
      return baseMetadata(pathname, title, description);
    }
    case "productDetail": {
      const product = humanize(resolved.params.productSlug ?? "Service");
      const game = humanize(resolved.params.gameSlug ?? "Game");
      return baseMetadata(
        pathname,
        `${product} | ${game} | misti.services`,
        `Professional ${product} for ${game}. Expert players, fast delivery, and safe methods. Trusted gaming boost services.`,
      );
    }
    case "blog":
      return baseMetadata(
        pathname,
        "Blog - Gaming Tips, Guides & News | misti.services",
        "Expert gaming guides, boost service tips, and industry news. Learn from professional players and enhance your gaming experience.",
      );
    case "blogPost": {
      const titlePart = humanize(resolved.params.slug ?? "Blog Post");
      return {
        ...baseMetadata(
          pathname,
          `${titlePart} | misti.services`,
          `Read our article about ${titlePart}. Gaming news, guides, and tips from misti.services.`,
        ),
        openGraph: {
          ...baseMetadata(pathname, "", "").openGraph,
          type: "article",
          siteName: SITE_NAME,
          title: `${titlePart} | misti.services`,
          description: `Read our article about ${titlePart}. Gaming news, guides, and tips from misti.services.`,
          url: withCanonical(pathname),
          images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
        },
      };
    }
    case "cashback":
      return baseMetadata(
        pathname,
        "Cashback Rewards Program | Earn Up to 5% Back | misti.services",
        "Join our cashback rewards program and earn up to 5% back on every order. Level up through tiers and save more with every purchase. Start earning today!",
      );
    case "sitemap":
      return baseMetadata(
        pathname,
        "Sitemap - misti.services | All Pages & Services",
        "Browse all games, services, and pages on misti.services. Find boosting, leveling, and carry services for your favorite games.",
      );
    case "workWithUs":
      return baseMetadata(
        pathname,
        "Join Our Team - Become a Booster at misti.services",
        "Apply to become a professional booster at misti.services. We're hiring experienced gamers for WoW, Diablo 4, Destiny 2 and more. Flexible hours, competitive pay.",
      );
    case "aboutUs":
      return baseMetadata(
        pathname,
        "About Us - Professional Gaming Boost Services | misti.services",
        "Learn about misti.services - Trusted gaming boost services since 2013. Professional team, 5.0 TrustScore, serving thousands of gamers worldwide.",
      );
    case "contactUs":
      return baseMetadata(
        pathname,
        "Contact Us - Get Support & Exclusive Deals | misti.services",
        "Contact misti.services on Discord for personalized gaming boost support, exclusive deals, and 24/7 customer service. Join our community today!",
      );
    case "paymentSuccess":
      return { ...baseMetadata(pathname, "Payment Success - misti.services", "Your payment has been processed successfully."), robots: noIndex };
    case "orders":
      return { ...baseMetadata(pathname, "My Orders - misti.services", "View and track your order history."), robots: noIndex };
    case "order":
      return { ...baseMetadata(pathname, "Order Details - misti.services", "View your order details and status."), robots: noIndex };
    case "checkout":
      return { ...baseMetadata(pathname, "Checkout - misti.services", "Complete your purchase securely."), robots: noIndex };
    case "auth":
      return { ...baseMetadata(pathname, "Sign In - misti.services", "Sign in to your account or create a new one."), robots: noIndex };
    case "account":
      return { ...baseMetadata(pathname, "My Account - misti.services", "Manage your account settings and preferences."), robots: noIndex };
    case "admin":
      return { ...baseMetadata(pathname, "Admin - misti.services", "Administrative area."), robots: noIndex };
    case "resetPassword":
      return { ...baseMetadata(pathname, "Reset Password - misti.services", "Create a new password for your account."), robots: noIndex };
    case "sitemapGenerator":
      return {
        ...baseMetadata(pathname, "Sitemap Generator - misti.services", "Generate and download XML sitemap for misti.services gaming boost services"),
        robots: noIndex,
      };
    case "gone":
      return {
        ...baseMetadata(
          pathname,
          "410 - Content Permanently Removed | misti.services",
          "This content has been permanently removed and is no longer available. The resource you requested will not be returning.",
        ),
        robots: noIndex,
      };
    case "forbidden":
      return {
        ...baseMetadata(
          pathname,
          "403 - Access Forbidden | misti.services",
          "You don't have permission to access this page. Please log in or contact support if you believe this is an error.",
        ),
        robots: noIndex,
      };
    case "notFound":
      return {
        ...baseMetadata(
          pathname,
          "404 - Page Not Found | misti.services",
          "The page you're looking for doesn't exist or has been moved. Return to our homepage to find what you need.",
        ),
        robots: noIndex,
      };
    default:
      return baseMetadata(pathname, "misti.services", "Professional gaming boost services.");
  }
}

export async function buildMetadataForPathAsync(pathname: string): Promise<Metadata> {
  const resolved = resolveRoute(pathname);
  if (!resolved) return buildMetadataForPath(pathname);

  try {
    if (resolved.key === "services") {
      const gameSlug = resolved.params.gameSlug;
      const categorySlug = resolved.params.categorySlug;
      if (!gameSlug) return buildMetadataForPath(pathname);

      const game = await fetchFromSupabase<{
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        meta_title: string | null;
        meta_description: string | null;
        meta_keywords: string | null;
        og_image: string | null;
        canonical_url: string | null;
        robots: string | null;
      }>("games", "id,name,description,image_url,meta_title,meta_description,meta_keywords,og_image,canonical_url,robots", [
        `slug=eq.${encodeURIComponent(gameSlug)}`,
        "is_active=eq.true",
      ]);
      if (!game) return buildMetadataForPath(pathname);

      let category: {
        name: string;
        meta_title: string | null;
        meta_description: string | null;
        meta_keywords: string | null;
        og_image: string | null;
      } | null = null;

      if (categorySlug) {
        category = await fetchFromSupabase<{
          name: string;
          meta_title: string | null;
          meta_description: string | null;
          meta_keywords: string | null;
          og_image: string | null;
        }>("categories", "name,meta_title,meta_description,meta_keywords,og_image", [
          `slug=eq.${encodeURIComponent(categorySlug)}`,
          `game_id=eq.${game.id}`,
          "is_active=eq.true",
        ]);
      }

      const title = category
        ? (category.meta_title || `${game.name} - ${category.name} Services | misti.services`)
        : (game.meta_title || `${game.name} Services | misti.services`);
      const description = category
        ? (category.meta_description || `Professional ${category.name} services for ${game.name}. Trusted boost services with fast delivery and safe methods.`)
        : (game.meta_description || game.description || `Browse all ${game.name} boost services. Professional gaming services with 24/7 support and guaranteed results.`);
      const keywords = category?.meta_keywords || game.meta_keywords || undefined;
      const canonical = category ? withCanonical(pathname) : (toAbsoluteUrl(game.canonical_url) || withCanonical(pathname));
      const image = toAbsoluteUrl(category?.og_image || game.og_image || game.image_url) || DEFAULT_OG_IMAGE;

      const metadata: Metadata = {
        title,
        description,
        keywords,
        alternates: { canonical },
        robots: category ? undefined : (game.robots || undefined),
        openGraph: {
          type: "website",
          siteName: SITE_NAME,
          title,
          description,
          url: canonical,
          images: [{ url: image, width: 1200, height: 630 }],
        },
        twitter: {
          card: "summary_large_image",
          site: "@mistiservices",
          title,
          description,
          images: [image],
        },
      };
      return metadata;
    }

    if (resolved.key === "productDetail") {
      const gameSlug = resolved.params.gameSlug;
      const categorySlug = resolved.params.categorySlug;
      const productSlug = resolved.params.productSlug;
      if (!gameSlug || !categorySlug || !productSlug) return buildMetadataForPath(pathname);

      const game = await fetchFromSupabase<{
        id: string;
        name: string;
        image_url: string | null;
        og_image: string | null;
      }>("games", "id,name,image_url,og_image", [
        `slug=eq.${encodeURIComponent(gameSlug)}`,
        "is_active=eq.true",
      ]);
      if (!game) return buildMetadataForPath(pathname);

      const category = await fetchFromSupabase<{
        id: string;
        name: string;
      }>("categories", "id,name", [
        `slug=eq.${encodeURIComponent(categorySlug)}`,
        `game_id=eq.${game.id}`,
        "is_active=eq.true",
      ]);
      if (!category) return buildMetadataForPath(pathname);

      const product = await fetchFromSupabase<{
        name: string;
        short_description: string | null;
        meta_title: string | null;
        meta_description: string | null;
        meta_keywords: string | null;
        og_image: string | null;
        image_url: string | null;
        canonical_url: string | null;
      }>("products", "name,short_description,meta_title,meta_description,meta_keywords,og_image,image_url,canonical_url", [
        `slug=eq.${encodeURIComponent(productSlug)}`,
        `category_id=eq.${category.id}`,
        "is_active=eq.true",
      ]);
      if (!product) return buildMetadataForPath(pathname);

      const title = product.meta_title || `${product.name} - ${category.name} | ${game.name} | misti.services`;
      const description = product.meta_description || product.short_description || `Professional ${product.name} for ${game.name}. Expert players, fast delivery, and safe methods. Trusted gaming boost services.`;
      const keywords = product.meta_keywords || `${game.name}, ${category.name}, ${product.name}, boost, gaming services`;
      const canonical = toAbsoluteUrl(product.canonical_url) || withCanonical(pathname);
      const image = toAbsoluteUrl(product.og_image || product.image_url || game.og_image || game.image_url) || DEFAULT_OG_IMAGE;

      return {
        title,
        description,
        keywords,
        alternates: { canonical },
        openGraph: {
          type: "website",
          siteName: SITE_NAME,
          title,
          description,
          url: canonical,
          images: [{ url: image, width: 1200, height: 630 }],
        },
        twitter: {
          card: "summary_large_image",
          site: "@mistiservices",
          title,
          description,
          images: [image],
        },
      };
    }

    if (resolved.key === "blogPost") {
      const slug = resolved.params.slug;
      if (!slug) return buildMetadataForPath(pathname);

      const post = await fetchFromSupabase<{
        title: string;
        excerpt: string | null;
        meta_description: string | null;
        featured_image: string | null;
        canonical_url: string | null;
      }>("blog_posts", "title,excerpt,meta_description,featured_image,canonical_url", [
        `slug=eq.${encodeURIComponent(slug)}`,
        "is_published=eq.true",
      ]);
      if (!post) return buildMetadataForPath(pathname);

      const title = `${post.title} | misti.services`;
      const description = post.meta_description || post.excerpt || `Read our article about ${post.title}. Gaming news, guides, and tips from misti.services.`;
      const canonical = toAbsoluteUrl(post.canonical_url) || withCanonical(pathname);
      const image = toAbsoluteUrl(post.featured_image) || DEFAULT_OG_IMAGE;

      return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
          type: "article",
          siteName: SITE_NAME,
          title,
          description,
          url: canonical,
          images: [{ url: image, width: 1200, height: 630 }],
        },
        twitter: {
          card: "summary_large_image",
          site: "@mistiservices",
          title,
          description,
          images: [image],
        },
      };
    }
  } catch {
    // Fallback to deterministic static metadata if async enrichment fails.
  }

  return buildMetadataForPath(pathname);
}
