import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { isPrerender, signalPrerenderReady } from "@/lib/prerender";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Breadcrumb from "@/components/Breadcrumb";
import CategorySidebar from "@/components/CategorySidebar";
import ServiceItem from "@/components/ServiceItem";
import ServiceItemSkeleton from "@/components/ServiceItemSkeleton";
import Footer from "@/components/LazyFooter";
import { Card } from "@/components/ui/card";
import { ContactSupportDropdown } from "@/components/ContactSupportDropdown";
import { Headphones, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBgSrc from "@/assets/hero-bg.jpg";

// Ensure heroBg is a string URL
const heroBg = typeof heroBgSrc === 'string' ? heroBgSrc : (heroBgSrc as any)?.default || (heroBgSrc as any)?.src || String(heroBgSrc);
import { useCurrency } from "@/contexts/CurrencyContext";
import { useGameWithCategories, useProductsBySlug } from "@/hooks/useGameData";
import { useGameFAQs } from "@/hooks/useGameFAQs";
import GameFAQSection from "@/components/GameFAQSection";
import { getOptimizedCoverUrl } from "@/lib/imageOptimization";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import { env } from "@/lib/env";

// Lazy-loaded Game FAQ Section wrapper
const LazyGameFAQSection = ({ gameId, gameName, shouldShow }: { gameId: string; gameName: string; shouldShow: boolean }) => {
  const { ref, isVisible } = useLazyLoad({ rootMargin: "300px" });
  
  if (!shouldShow) return null;
  
  return (
    <div ref={ref}>
      {isVisible && <GameFAQSection gameId={gameId} gameName={gameName} />}
    </div>
  );
};

const Services = () => {
  const { gameSlug, categorySlug } = useParams<{ gameSlug: string; categorySlug?: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [deletedPaths, setDeletedPaths] = useState<Set<string>>(new Set());
  const [redirectChecked, setRedirectChecked] = useState(false);
  const ITEMS_PER_PAGE = 12;
  const { formatPrice } = useCurrency();

  // OPTIMIZED: Fetch game and categories in a single JOIN query
  const { data: gameData, isLoading: gameLoading, error: gameError } = useGameWithCategories(gameSlug);
  
  const game = gameData?.game;
  const categories = gameData?.categories || [];

  // Find selected category by slug (already have it from useGameWithCategories)
  const selectedCategory = categories.find(c => c.slug === categorySlug);
  
  // OPTIMIZED: Fetch products by slug directly - no categoryIds dependency!
  // Uses JOIN query to eliminate waterfall: game → categories → products
  const { 
    data: productsData, 
    isLoading: productsLoading 
  } = useProductsBySlug(gameSlug, categorySlug, currentPage, ITEMS_PER_PAGE);

  // Fetch game FAQs for rich results (only on game-level pages)
  const { data: gameFAQs = [] } = useGameFAQs(!categorySlug ? game?.id : undefined);

  // Merge paginated results
  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  // Reset page and products when category changes
  useEffect(() => {
    setCurrentPage(1);
    setAllProducts([]);
  }, [categorySlug]);

  // Update all products when new page loads
  useEffect(() => {
    if (currentPage === 1 && products.length > 0) {
      setAllProducts(products);
    } else if (currentPage > 1 && products.length > 0) {
      setAllProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = products.filter(p => !existingIds.has(p.id));
        return newProducts.length > 0 ? [...prev, ...newProducts] : prev;
      });
    }
  }, [products, currentPage]);

  const displayProducts = allProducts.length > 0 ? allProducts : products;
  const hasMore = displayProducts.length < totalProducts;

  const loadMoreProducts = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Signal prerender ready when game data is loaded
  useEffect(() => {
    if (!gameLoading && game) {
      // Delay to ensure React Helmet has updated <head> before signaling ready
      // Using 500ms for pages with category/game data and FAQs
      const timer = setTimeout(() => {
        signalPrerenderReady({ requireStructuredData: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameLoading, game]);

  // Check for deleted URLs (410 Gone handling)
  useEffect(() => {
    const checkDeletedUrls = async () => {
      if (!gameSlug) return;
      
      const gamePath = `/game/${gameSlug}`;
      const categoryPath = categorySlug ? `/game/${gameSlug}/${categorySlug}` : null;
      const pathsToCheck = [gamePath];
      if (categoryPath) pathsToCheck.push(categoryPath);
      
      const { data } = await supabase
        .from('deleted_urls')
        .select('url_path')
        .in('url_path', pathsToCheck);
      
      if (data && data.length > 0) {
        setDeletedPaths(new Set(data.map(d => d.url_path)));
      }
    };
    
    checkDeletedUrls();
  }, [gameSlug, categorySlug]);

  // Redirect to /gone if game or category was deleted
  useEffect(() => {
    if (gameLoading || deletedPaths.size === 0) return;
    
    const gamePath = `/game/${gameSlug}`;
    const categoryPath = `/game/${gameSlug}/${categorySlug}`;
    
    // Game is deleted and not found
    if (!game && deletedPaths.has(gamePath)) {
      navigate("/gone", { replace: true });
      return;
    }
    
    // Category is deleted (game exists but category doesn't match any)
    const matchedCategory = categories.find(c => c.slug === categorySlug);
    if (categorySlug && game && !matchedCategory && deletedPaths.has(categoryPath)) {
      navigate("/gone", { replace: true });
      return;
    }
  }, [gameLoading, game, categories, deletedPaths, gameSlug, categorySlug, navigate]);

  // Check for redirects when game is not found (before showing error)
  useEffect(() => {
    const checkGameRedirect = async () => {
      // Only run if game loading is complete and game was not found
      if (gameLoading || game) {
        setRedirectChecked(false);
        return;
      }
      
      // Build full path to check
      const fullPath = `/game/${gameSlug}${categorySlug ? `/${categorySlug}` : ''}`;
      
      try {
        // Check for redirect in database
        const response = await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-redirects?path=${encodeURIComponent(fullPath)}`,
          {
            headers: {
              'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.redirect) {
            // Perform redirect (use replace to avoid back-button issues)
            window.location.replace(window.location.origin + data.redirect.destination);
            return;
          }
        }
        
        // No redirect found - mark as checked
        setRedirectChecked(true);
      } catch (error) {
        console.error("Redirect check failed:", error);
        setRedirectChecked(true);
      }
    };
    
    checkGameRedirect();
  }, [gameLoading, game, gameSlug, categorySlug]);

  // Create slug-based fallback SEO (used during loading)
  const createFallbackTitle = () => {
    const gameName = gameSlug?.replace(/-/g, ' ') || 'Game';
    const categoryName = categorySlug?.replace(/-/g, ' ') || '';
    return `${gameName}${categoryName ? ` - ${categoryName}` : ''} Services | misti.services`;
  };

  const createFallbackDescription = () => {
    const gameName = gameSlug?.replace(/-/g, ' ') || 'game';
    return `Browse professional ${gameName} boost services. Trusted gaming services with fast delivery and safe methods.`;
  };

  const getFallbackCanonical = () => {
    return `/game/${gameSlug}${categorySlug ? `/${categorySlug}` : ''}`;
  };

  // selectedCategory is already computed above (line 54)

  // Create SEO-optimized meta title
  const createMetaTitle = () => {
    // Category-level custom SEO takes priority
    if (selectedCategory?.meta_title) {
      return selectedCategory.meta_title;
    }
    // Then game-level custom SEO
    if (!categorySlug && game.meta_title) {
      return game.meta_title;
    }
    // Fallback to auto-generated
    return `${game.name}${categorySlug ? ` - ${selectedCategory?.name || ''}` : ''} Services | misti.services`;
  };

  // Create SEO-optimized meta description (150-160 chars)
  const createMetaDescription = () => {
    // Category-level custom SEO takes priority
    if (selectedCategory?.meta_description) {
      return selectedCategory.meta_description;
    }
    
    if (selectedCategory) {
      // Category-specific auto-generated description
      return `Professional ${selectedCategory.name} services for ${game.name}. Trusted boost services with fast delivery and safe methods.`;
    }
    
    // Game-level custom SEO
    if (game.meta_description) {
      return game.meta_description;
    }
    
    // Game-level fallback using description
    if (game.description && game.description.length <= 160) {
      return game.description;
    }
    
    return `Browse all ${game.name} boost services. Professional gaming services with 24/7 support and guaranteed results.`;
  };

  // Create SEO-optimized keywords
  const createMetaKeywords = () => {
    // Category-level custom SEO takes priority
    if (selectedCategory?.meta_keywords) {
      return selectedCategory.meta_keywords;
    }
    // Game-level custom SEO
    if (!categorySlug && game.meta_keywords) {
      return game.meta_keywords;
    }
    // Fallback to auto-generated
    return `${game.name}, ${game.name} boost, ${categorySlug ? selectedCategory?.name || 'gaming services' : 'gaming services'}, professional boosting, ${game.name} rank boost, ${game.name} character leveling, ${game.name} services`;
  };

  // Get OG image
  const getOgImage = () => {
    // Category-level custom SEO takes priority
    if (selectedCategory?.og_image) {
      return selectedCategory.og_image;
    }
    // Game-level custom SEO
    if (game.og_image) {
      return game.og_image;
    }
    // Fallback to game image
    return game.image_url || undefined;
  };

  // Get canonical URL (Phase 2)
  const getCanonicalUrl = () => {
    // Custom canonical URL takes priority (only at game level, not category)
    if (!categorySlug && game.canonical_url) {
      return game.canonical_url;
    }
    // Default canonical
    return `/game/${gameSlug}${categorySlug ? `/${categorySlug}` : ''}`;
  };

  // Get robots directive (Phase 2)
  const getRobots = () => {
    // Only apply custom robots at game level (not category)
    if (!categorySlug && game.robots) {
      return game.robots;
    }
    return undefined; // Use default index,follow
  };

  // Build VideoGame schema (Phase 2)
  const buildVideoGameSchema = () => {
    if (categorySlug) return null; // Only on game-level pages
    
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": game.name,
      "url": `https://misti.services/game/${gameSlug}`,
      "description": game.meta_description || game.description || `Professional ${game.name} boost services`,
      "provider": {
        "@type": "Organization",
        "name": "misti.services",
        "url": "https://misti.services"
      }
    };

    // Add game platforms if available
    if (game.game_platform) {
      schema.gamePlatform = game.game_platform.split(',').map(p => p.trim());
    }

    // Add image if available
    if (game.og_image || game.image_url) {
      schema.image = game.og_image || game.image_url;
    }

    return schema;
  };

  // Build structured data array
  const buildStructuredData = () => {
    const structuredData: any[] = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": categorySlug 
          ? [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://misti.services"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": game.name,
                "item": `https://misti.services/game/${gameSlug}`
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": categories.find(c => c.slug === categorySlug)?.name || 'Services',
                "item": `https://misti.services/game/${gameSlug}/${categorySlug}`
              }
            ]
          : [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://misti.services"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": game.name,
                "item": `https://misti.services/game/${gameSlug}`
              }
            ]
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": displayProducts.slice(0, 20).map((product, index) => {
          const category = categories.find(c => c.id === product.category_id);
          return {
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Service",
              "name": product.name,
              "description": product.meta_description || product.short_description || `Professional ${product.name} service`,
              "url": `https://misti.services/game/${game.slug}/${category?.slug}/${product.slug}`,
              "image": product.image_url,
              "provider": {
                "@type": "Organization",
                "name": "misti.services"
              },
              "offers": {
                "@type": "Offer",
                "price": product.base_price,
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
              }
            }
          };
        })
      }
    ];

    // Add VideoGame schema for game-level pages
    const videoGameSchema = buildVideoGameSchema();
    if (videoGameSchema) {
      structuredData.push(videoGameSchema);
    }

    // Add FAQ schema for game-level pages with FAQs (Phase 3)
    if (!categorySlug && gameFAQs.length > 0) {
      structuredData.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": gameFAQs.map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    return structuredData;
  };

  // Determine if we have loaded game data
  const hasGameData = !gameLoading && game;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={hasGameData ? createMetaTitle() : createFallbackTitle()}
        description={hasGameData ? createMetaDescription() : createFallbackDescription()}
        canonical={hasGameData ? getCanonicalUrl() : getFallbackCanonical()}
        keywords={hasGameData ? createMetaKeywords() : undefined}
        ogImage={hasGameData ? getOgImage() : undefined}
        robots={hasGameData ? getRobots() : undefined}
        structuredData={hasGameData ? buildStructuredData() : undefined}
      />
      
      <Navigation />

      {/* Loading state - show skeleton */}
      {gameLoading ? (
        <div className="container mx-auto px-4 pt-24">
          {isPrerender() ? (
            // Static skeleton for prerender bots (no spinner)
            <div className="space-y-4" aria-hidden="true">
              <div className="h-12 bg-muted/30 rounded w-64 mb-4"></div>
              <div className="h-6 bg-muted/30 rounded w-1/2"></div>
              <div className="h-48 bg-muted/30 rounded"></div>
            </div>
          ) : (
            // Animated spinner for real users
            <>
              <div className="h-12 bg-muted/30 rounded animate-pulse w-64 mb-4"></div>
              <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            </>
          )}
        </div>
      ) : gameError || !game ? (
        // Error or not found state - wait for redirect check first
        redirectChecked ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-muted-foreground">Game not found</p>
          </div>
        ) : (
          // Show loading while checking for redirects
          <div className="container mx-auto px-4 pt-24">
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          </div>
        )
      ) : (
        <>
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={game.hero_image_url ? getOptimizedCoverUrl(game.hero_image_url, 1920, 600) : heroBg} 
            alt={`${game.name} professional boost services - Background hero image`}
            className={`w-full h-full object-cover opacity-20 ${
              game.hero_image_position === 'top' ? 'object-top' :
              game.hero_image_position === 'bottom' ? 'object-bottom' :
              'object-center'
            }`}
            loading="eager"
            width={1920}
            height={600}
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-95" />
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <Breadcrumb items={[
            { label: "Home Page", href: "/" },
            { label: game.name }
          ]} />
          
          <h1 className="text-4xl md:text-5xl font-bold mb-8 min-h-[3rem]">
            {game.name}
          </h1>

          {/* Help Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-accent/30 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Need Help?</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask questions to a PRO player and get a personalised deal at the best price!
                  </p>
                </div>
              </div>
              <ContactSupportDropdown 
                productName={`${game.name} - Custom Order`}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              />
            </div>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 relative overflow-hidden">
        {/* Multi-layer gradient background - matching Hero style */}
        <div className="absolute inset-0 z-0">
          {/* Base gradient: Deep navy/purple tones */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,45%,10%)] via-[hsl(230,40%,12%)] to-background" />
          
          {/* Radial purple glow - top center */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, hsl(250, 40%, 20%) 0%, transparent 50%)',
            }}
          />
          
          {/* Radial blue glow - left side */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(ellipse at 0% 30%, hsl(220, 60%, 25%) 0%, transparent 40%)',
            }}
          />
          
          {/* Subtle accent glow - right side */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              background: 'radial-gradient(ellipse at 100% 60%, hsl(260, 50%, 22%) 0%, transparent 35%)',
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="md:w-72 flex-shrink-0">
              <CategorySidebar gameSlug={game.slug} categories={categories} selectedCategory={categorySlug} />
            </aside>

            {/* Services Grid */}
            <div className="flex-1">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {categorySlug ? categories.find(c => c.slug === categorySlug)?.name || 'Services' : 'All Services'}
                </h2>
                <p className="text-muted-foreground">
                  {categorySlug 
                    ? `Browse ${categories.find(c => c.slug === categorySlug)?.name || 'services'} for ${game.name}` 
                    : `All available services for ${game.name}`}
                </p>
              </div>
              
              {productsLoading && currentPage === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ServiceItemSkeleton key={i} />
                  ))}
                </div>
              ) : displayProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayProducts.map((product) => {
                      const category = categories.find(c => c.id === product.category_id);
                      return (
                        <ServiceItem
                          key={product.id}
                          title={product.name}
                          image={product.image_url || heroBg}
                          features={[]}
                          price={formatPrice(product.base_price)}
                          badge={product.badge_text || undefined}
                          slug={`/game/${game.slug}/${category?.slug}/${product.slug}`}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button
                        onClick={loadMoreProducts}
                        disabled={productsLoading}
                        size="lg"
                        className="min-w-[200px]"
                      >
                        {productsLoading && currentPage > 1 ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Products'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  No products available yet. Products will appear here once they are added by administrators.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Game FAQs Section - Lazy-loaded on game-level pages */}
      <LazyGameFAQSection 
        gameId={game.id} 
        gameName={game.name} 
        shouldShow={!categorySlug} 
      />

      <Footer />
        </>
      )}
    </div>
  );
};

export default Services;
