import type { Metadata } from "next";
import { resolveRoute } from "@/lib/nextRoutes";

const SITE_NAME = "misti.services";
const SITE_URL = "https://misti.services";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/dATtYjrZg8XQKUHNOV3bqcwDO6T2/social-images/social-1760973850614-favicon%20png.png";

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
