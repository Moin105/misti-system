import { lazy, Suspense, useEffect } from "react";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import PopularGameCard from "@/components/PopularGameCard";
import OtherGameCard from "@/components/OtherGameCard";
import Footer from "@/components/LazyFooter";
import ErrorBoundary from "@/components/ErrorBoundary";
import SectionSkeleton from "@/components/SectionSkeleton";
import { signalPrerenderReady } from "@/lib/prerender";
import { useInitialPageData } from "@/hooks/useInitialPageData";
import { usePrefetchPopularGames } from "@/hooks/usePrefetchVisibleRoutes";
import { useLazyLoad } from "@/hooks/useLazyLoad";


const ServiceHighlights = lazy(() => import("@/components/ServiceHighlights"));
const FeaturesSection = lazy(() => import("@/components/FeaturesSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const CashbackBanner = lazy(() => import("@/components/CashbackBanner"));
const SiteFAQSection = lazy(() => import("@/components/SiteFAQSection"));

// IntersectionObserver-based lazy section wrapper for below-fold content
const LazySection = ({ children, height, showCards }: { children: React.ReactNode; height: string; showCards?: boolean }) => {
  const { ref, isVisible } = useLazyLoad({ rootMargin: "400px" });
  
  // Use CSS class for common heights, fallback to inline for custom
  const heightClass = height === "48px" ? "min-h-separator" : height === "592px" ? "min-h-hero" : "";
  
  return (
    <div ref={ref} className={heightClass} style={heightClass ? undefined : { minHeight: height }}>
      {isVisible ? children : <SectionSkeleton height={height} showCards={showCards} />}
    </div>
  );
};

const Index = () => {
  // Use consolidated initial page data hook - single API call for all critical data
  const { data: initialData, isLoading: loading } = useInitialPageData();

  const games = initialData?.games || [];
  const reviewConfig = initialData?.reviewConfig;
  const popularGames = games.filter((game) => game.is_popular).slice(0, 6);
  const otherGames = games.filter((game) => !game.is_popular);

  // Eagerly prefetch data for top popular games during idle time
  usePrefetchPopularGames(popularGames, 3);

  // Signal to prerender tools that critical content is ready
  useEffect(() => {
    if (!loading && games.length > 0) {
      // Delay to ensure React Helmet has updated <head> before signaling ready
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, games.length]);

  // Build structured data with dynamic review ratings
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "misti.services",
      url: "https://misti.services",
      logo: "https://storage.googleapis.com/gpt-engineer-file-uploads/dATtYjrZg8XQKUHNOV3bqcwDO6T2/social-images/social-1760973850614-favicon png.png",
      description: "Professional gaming boost services provider since 2013. Specializing in WoW, Path of Exile 2, and MMO boosting with fast, secure delivery.",
      foundingDate: "2013",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://misti.services/contact-us"
      },
      sameAs: ["https://twitter.com/misti_services"],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewConfig?.average_rating?.toString() || "4.9",
        reviewCount: reviewConfig?.total_reviews?.toString() || "326",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "misti.services",
      url: "https://misti.services",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://misti.services/?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    // SiteNavigationElement for better sitelinks in search results
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Main Navigation",
      hasPart: [
        { "@type": "SiteNavigationElement", name: "Home", url: "https://misti.services/" },
        { "@type": "SiteNavigationElement", name: "Blog", url: "https://misti.services/blog" },
        { "@type": "SiteNavigationElement", name: "About Us", url: "https://misti.services/about-us" },
        { "@type": "SiteNavigationElement", name: "Contact", url: "https://misti.services/contact-us" },
        { "@type": "SiteNavigationElement", name: "Cashback", url: "https://misti.services/cashback" },
      ],
    },
    ...(!loading && popularGames.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: popularGames.map((game, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "VideoGame",
                name: game.name,
                url: `https://misti.services/game/${game.slug}`,
                image: game.image_url,
                description: game.meta_description || `${game.name} boosting services at misti.services`,
              },
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="WoW & MMO Boost Services | misti.services - Trusted Since 2013"
        description="Professional WoW, Path of Exile 2 & Diablo IV boosting services. Fast power leveling, raid carries & PvP boosts since 2013. Safe & secure delivery."
        canonical="/"
        keywords="WoW boost, WoW boosting services, Path of Exile 2 boost, PoE 2 boost, Diablo IV boost, MMO boosting, power leveling services, raid carry, PvP boost, War Within boost, WoW Classic boost, misti.services, safe game boosting, professional gaming services"
        ogImage="https://storage.googleapis.com/gpt-engineer-file-uploads/dATtYjrZg8XQKUHNOV3bqcwDO6T2/social-images/social-1760973850614-favicon png.png"
        structuredData={structuredData}
      />
      <Navigation />
      <Hero />
      
      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton height="400px" />}>
          <ServiceHighlights />
        </Suspense>
      </ErrorBoundary>

      {/* Separator - Fixed height */}
      <div className="relative overflow-hidden h-separator min-h-separator">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      {/* Popular Gaming Services Section - Fixed height to prevent CLS */}
      <section
        id="popular-games"
        className="py-8 md:py-12 container mx-auto px-4 relative bg-gradient-to-b from-background to-accent/5 contain-layout-style-paint min-h-hero"
      >
        <div className="text-center mb-8 h-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Popular Gaming Services
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 min-h-[392px]">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-card/50 rounded-xl h-[180px]" />
              ))}
            </>
          ) : (
            popularGames.map((game, index) => (
              <PopularGameCard key={game.id} title={game.name} icon={game.icon_url} slug={game.slug} priority={index < 6} />
            ))
          )}
        </div>
      </section>

      {/* Separator */}
      <div className="relative overflow-hidden h-separator min-h-separator">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      {/* More Games Available Section */}
      {otherGames.length > 0 && (
        <section
          id="other-games"
          className="py-8 md:py-12 container mx-auto px-4 relative contain-layout"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              More Games Available
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="animate-pulse bg-card/50 rounded-xl h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {otherGames.map((game) => (
                <OtherGameCard key={game.id} title={game.name} icon={game.icon_url} slug={game.slug} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Separator */}
      <div className="relative h-12 md:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      {/* Cashback Banner */}
      <ErrorBoundary>
        <Suspense fallback={<SectionSkeleton height="300px" />}>
          <CashbackBanner />
        </Suspense>
      </ErrorBoundary>

      {/* Separator */}
      <div className="relative h-12 md:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      <ErrorBoundary>
        <section style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
          <Suspense fallback={<SectionSkeleton height="600px" showCards />}>
            <FeaturesSection />
          </Suspense>
        </section>
      </ErrorBoundary>

      {/* Separator */}
      <div className="relative h-12 md:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-card via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      <ErrorBoundary>
        <section style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          <Suspense fallback={<SectionSkeleton height="500px" showCards />}>
            <HowItWorksSection />
          </Suspense>
        </section>
      </ErrorBoundary>

      {/* Separator */}
      <div className="relative h-12 md:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-500/5 to-muted/20" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-500 to-purple-500" />
      </div>

      <ErrorBoundary>
        <LazySection height="400px" showCards>
          <section style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
            <Suspense fallback={<SectionSkeleton height="400px" showCards />}>
              <TestimonialsSection />
            </Suspense>
          </section>
        </LazySection>
      </ErrorBoundary>

      {/* Separator */}
      <div className="relative h-12 md:h-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-purple-500/5 to-background" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-purple-500 to-blue-500" />
      </div>

      <ErrorBoundary>
        <LazySection height="400px">
          <Suspense fallback={<SectionSkeleton height="400px" />}>
            <SiteFAQSection />
          </Suspense>
        </LazySection>
      </ErrorBoundary>

      <Footer />
    </div>
  );
};

export default Index;
