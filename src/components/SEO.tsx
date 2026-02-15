import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  keywords?: string;
  structuredData?: object | object[];
  robots?: string;
  // Article-specific props for blog posts
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  ogType?: "website" | "article";
}

const SEO = ({
  title = "misti.services - Professional Gaming Boost Services",
  description = "Boost your account and gaming skills with professional services. Trusted by thousands of gamers worldwide with 5.0 TrustScore.",
  canonical,
  ogImage,
  noindex = false,
  keywords,
  structuredData,
  robots,
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  ogType = "website",
}: SEOProps) => {
  const location = useLocation();
  const baseUrl = "https://misti.services";
  const siteName = "misti.services";
  const twitterHandle = "@mistiservices";

  // Fix canonical fallback: use current route if not provided
  const fullCanonical = canonical
    ? canonical.startsWith("http://") || canonical.startsWith("https://")
      ? canonical
      : `${baseUrl}${canonical.startsWith("/") ? canonical : `/${canonical}`}`
    : `${baseUrl}${location.pathname}`;

  // Ensure OG image is absolute URL - use URL-encoded default image (no spaces)
  const defaultOgImage =
    "https://storage.googleapis.com/gpt-engineer-file-uploads/dATtYjrZg8XQKUHNOV3bqcwDO6T2/social-images/social-1760973850614-favicon%20png.png";
  const imageToUse = ogImage || defaultOgImage;
  const absoluteOgImage =
    imageToUse.startsWith("http://") || imageToUse.startsWith("https://")
      ? imageToUse
      : `${baseUrl}${imageToUse.startsWith("/") ? imageToUse : `/${imageToUse}`}`;

  // Determine robots content
  const robotsContent = noindex
    ? "noindex,nofollow"
    : robots || "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Debug meta tag to verify React Helmet is active in prerendered content */}
      <meta name="x-seo-source" content="react-helmet" />

      {/* Robots directive - always output for clarity */}
      <meta name="robots" content={robotsContent} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OpenGraph tags */}
      {ogType === "article" && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === "article" && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === "article" && articleAuthor && <meta property="article:author" content={articleAuthor} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteOgImage} />

      {/* JSON-LD Structured Data */}
      {structuredData &&
        (Array.isArray(structuredData) ? (
          structuredData.map((data, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(data)}
            </script>
          ))
        ) : (
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        ))}
    </Helmet>
  );
};

export default SEO;
