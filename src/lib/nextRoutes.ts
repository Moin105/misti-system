export type RouteKey =
  | "index"
  | "services"
  | "productDetail"
  | "checkout"
  | "paymentSuccess"
  | "order"
  | "orders"
  | "auth"
  | "account"
  | "admin"
  | "blog"
  | "blogPost"
  | "sitemap"
  | "sitemapGenerator"
  | "workWithUs"
  | "aboutUs"
  | "contactUs"
  | "cashback"
  | "resetPassword"
  | "gone"
  | "forbidden"
  | "notFound";

export interface ResolvedRoute {
  key: RouteKey;
  params: Record<string, string>;
}

interface RouteMatcher {
  key: RouteKey;
  regex: RegExp;
  paramNames: string[];
}

const routes: RouteMatcher[] = [
  { key: "index", regex: /^\/$/, paramNames: [] },
  { key: "services", regex: /^\/game\/([^/]+)$/, paramNames: ["gameSlug"] },
  {
    key: "services",
    regex: /^\/game\/([^/]+)\/([^/]+)$/,
    paramNames: ["gameSlug", "categorySlug"],
  },
  {
    key: "productDetail",
    regex: /^\/game\/([^/]+)\/([^/]+)\/([^/]+)$/,
    paramNames: ["gameSlug", "categorySlug", "productSlug"],
  },
  { key: "checkout", regex: /^\/checkout$/, paramNames: [] },
  { key: "paymentSuccess", regex: /^\/payment-success$/, paramNames: [] },
  { key: "order", regex: /^\/order\/([^/]+)$/, paramNames: ["orderId"] },
  { key: "orders", regex: /^\/orders$/, paramNames: [] },
  { key: "auth", regex: /^\/auth$/, paramNames: [] },
  { key: "account", regex: /^\/account$/, paramNames: [] },
  { key: "admin", regex: /^\/admin$/, paramNames: [] },
  { key: "blog", regex: /^\/blog$/, paramNames: [] },
  { key: "blogPost", regex: /^\/blog\/([^/]+)$/, paramNames: ["slug"] },
  { key: "sitemap", regex: /^\/sitemap$/, paramNames: [] },
  { key: "sitemapGenerator", regex: /^\/sitemap-generator$/, paramNames: [] },
  { key: "workWithUs", regex: /^\/work-with-us$/, paramNames: [] },
  { key: "aboutUs", regex: /^\/about-us$/, paramNames: [] },
  { key: "contactUs", regex: /^\/contact-us$/, paramNames: [] },
  { key: "cashback", regex: /^\/cashback$/, paramNames: [] },
  { key: "resetPassword", regex: /^\/reset-password$/, paramNames: [] },
  { key: "gone", regex: /^\/gone$/, paramNames: [] },
  { key: "forbidden", regex: /^\/forbidden$/, paramNames: [] },
  { key: "notFound", regex: /^\/404$/, paramNames: [] },
];

export function resolveRoute(pathname: string): ResolvedRoute | null {
  for (const route of routes) {
    const match = pathname.match(route.regex);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, idx) => {
      params[name] = decodeURIComponent(match[idx + 1] ?? "");
    });
    return { key: route.key, params };
  }
  return null;
}
