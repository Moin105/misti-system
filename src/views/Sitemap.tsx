import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Gamepad2, 
  FileText, 
  Users, 
  Mail, 
  Briefcase, 
  Coins,
  Newspaper,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SitemapGame {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  icon_url: string | null;
  categories: SitemapCategory[];
}

interface SitemapCategory {
  id: string;
  name: string;
  slug: string;
  products: SitemapProduct[];
}

interface SitemapProduct {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
}

const staticPages = [
  { name: "Home", path: "/", icon: Gamepad2 },
  { name: "About Us", path: "/about-us", icon: Users },
  { name: "Contact Us", path: "/contact-us", icon: Mail },
  { name: "Work With Us", path: "/work-with-us", icon: Briefcase },
  { name: "Cashback Program", path: "/cashback", icon: Coins },
  { name: "Blog", path: "/blog", icon: Newspaper },
];

const Sitemap = () => {
  const [games, setGames] = useState<SitemapGame[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [blogExpanded, setBlogExpanded] = useState(false);
  
  const BLOG_PREVIEW_COUNT = 9;

  useEffect(() => {
    fetchSitemapData();
  }, []);

  const fetchSitemapData = async () => {
    try {
      // Fetch games with categories and products
      const { data: gamesData } = await supabase
        .from("games")
        .select("id, name, slug, image_url, icon_url")
        .eq("is_active", true)
        .order("sort_order");

      if (gamesData) {
        const gamesWithCategories = await Promise.all(
          gamesData.map(async (game) => {
            const { data: categoriesData } = await supabase
              .from("categories")
              .select("id, name, slug")
              .eq("game_id", game.id)
              .eq("is_active", true)
              .order("sort_order");

            const categoriesWithProducts = await Promise.all(
              (categoriesData || []).map(async (category) => {
                const { data: productsData } = await supabase
                  .from("products")
                  .select("id, name, slug")
                  .eq("category_id", category.id)
                  .eq("is_active", true)
                  .order("sort_order")
                  .limit(50);

                return {
                  ...category,
                  products: productsData || [],
                };
              })
            );

            return {
              ...game,
              categories: categoriesWithProducts,
            };
          })
        );

        setGames(gamesWithCategories);
        // Expand all games by default
        setExpandedGames(new Set(gamesWithCategories.map(g => g.id)));
      }

      // Fetch blog posts
      const { data: postsData } = await supabase
        .from("blog_posts")
        .select("id, title, slug")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(50);

      if (postsData) {
        setBlogPosts(postsData);
      }
    } catch (error) {
      console.error("Error fetching sitemap data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGame = (gameId: string) => {
    setExpandedGames(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const totalProducts = games.reduce(
    (acc, game) => acc + game.categories.reduce((catAcc, cat) => catAcc + cat.products.length, 0),
    0
  );

  const totalCategories = games.reduce((acc, game) => acc + game.categories.length, 0);

  return (
    <>
      <SEO
        title="Sitemap - misti.services | All Pages & Services"
        description="Browse all games, services, and pages on misti.services. Find boosting, leveling, and carry services for your favorite games."
        canonical="/sitemap"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />

        <main className="flex-1 pt-20">
          {/* Hero Section */}
          <section className="relative py-12 md:py-16 bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Site Map
                  </span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Navigate through all our games, services, and pages. Find exactly what you're looking for.
                </p>
                {!loading && (
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground pt-2">
                    <span className="bg-muted/50 px-3 py-1 rounded-full">{games.length} Games</span>
                    <span className="bg-muted/50 px-3 py-1 rounded-full">{totalCategories} Categories</span>
                    <span className="bg-muted/50 px-3 py-1 rounded-full">{totalProducts} Products</span>
                    <span className="bg-muted/50 px-3 py-1 rounded-full">{blogPosts.length} Blog Posts</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-6xl mx-auto space-y-10">
              {/* Static Pages Section */}
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Main Pages
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {staticPages.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="group p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                    >
                      <page.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">
                        {page.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Games Section */}
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" />
                  Games & Services
                </h2>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.map((game) => (
                      <Card
                        key={game.id}
                        className="overflow-hidden border-border/50 hover:border-primary/30 transition-all"
                      >
                        {/* Game Header */}
                        <div
                          className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleGame(game.id)}
                        >
                          {game.icon_url || game.image_url ? (
                            <img
                              src={game.icon_url || game.image_url || ""}
                              alt={game.name}
                              className="w-12 h-12 rounded-lg object-cover bg-muted"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Gamepad2 className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/game/${game.slug}`}
                              className="font-semibold hover:text-primary transition-colors block truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {game.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {game.categories.length} categories
                            </span>
                          </div>
                          {expandedGames.has(game.id) ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Categories List */}
                        {expandedGames.has(game.id) && game.categories.length > 0 && (
                          <div className="border-t border-border/50 bg-muted/20">
                            {game.categories.map((category) => (
                              <div key={category.id} className="border-b border-border/30 last:border-b-0">
                                {/* Category Header */}
                                <div
                                  className={cn(
                                    "px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors",
                                    category.products.length > 0 && "cursor-pointer"
                                  )}
                                  onClick={() => category.products.length > 0 && toggleCategory(category.id)}
                                >
                                  {category.products.length > 0 ? (
                                    expandedCategories.has(category.id) ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )
                                  ) : (
                                    <div className="w-4" />
                                  )}
                                  <Link
                                    to={`/game/${game.slug}/${category.slug}`}
                                    className="text-sm hover:text-primary transition-colors flex-1 truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {category.name}
                                  </Link>
                                  {category.products.length > 0 && (
                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {category.products.length}
                                    </span>
                                  )}
                                </div>

                                {/* Products List */}
                                {expandedCategories.has(category.id) && category.products.length > 0 && (
                                  <div className="pl-10 pr-4 pb-2 space-y-1">
                                    {category.products.map((product) => (
                                      <Link
                                        key={product.id}
                                        to={`/game/${game.slug}/${category.slug}/${product.slug}`}
                                        className="text-xs text-muted-foreground hover:text-primary transition-colors block py-0.5 truncate"
                                      >
                                        {product.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Blog Section */}
              {blogPosts.length > 0 && (
                <section>
                  <div 
                    className="flex items-center justify-between mb-4 cursor-pointer group"
                    onClick={() => setBlogExpanded(!blogExpanded)}
                  >
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                      <Newspaper className="w-5 h-5 text-primary" />
                      Blog Posts
                      <span className="text-sm font-normal text-muted-foreground">
                        ({blogPosts.length} articles)
                      </span>
                    </h2>
                    {blogPosts.length > BLOG_PREVIEW_COUNT && (
                      <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                        {blogExpanded ? "Show less" : `View all ${blogPosts.length}`}
                        {blogExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <Card className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(blogExpanded ? blogPosts : blogPosts.slice(0, BLOG_PREVIEW_COUNT)).map((post) => (
                        <Link
                          key={post.id}
                          to={`/blog/${post.slug}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 p-2 rounded hover:bg-muted/30"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{post.title}</span>
                        </Link>
                      ))}
                    </div>
                    {!blogExpanded && blogPosts.length > BLOG_PREVIEW_COUNT && (
                      <div className="mt-4 pt-3 border-t border-border/50 text-center">
                        <button 
                          onClick={() => setBlogExpanded(true)}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          + {blogPosts.length - BLOG_PREVIEW_COUNT} more articles
                        </button>
                      </div>
                    )}
                  </Card>
                </section>
              )}

              {/* XML Sitemap Link */}
              <section className="text-center pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Looking for our XML sitemap?{" "}
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View sitemap.xml
                  </a>
                </p>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Sitemap;
