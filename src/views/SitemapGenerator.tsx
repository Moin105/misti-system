import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, FileText, Globe, Newspaper, Gamepad2, Package, Folder, Upload, RefreshCw, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { generateSitemapXml, formatDateISO, downloadFile } from "@/lib/sitemapUtils";

interface SitemapConfig {
  base_url: string;
  include_games: boolean;
  include_products: boolean;
  include_blog: boolean;
  game_priority: number;
  product_priority: number;
  blog_priority: number;
  static_page_priority: number;
}

const SitemapGenerator = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [sitemapXml, setSitemapXml] = useState("");
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [publishedUrlCount, setPublishedUrlCount] = useState<number | null>(null);
  const [stats, setStats] = useState({
    games: 0,
    categories: 0,
    products: 0,
    blog: 0,
    static: 0,
    total: 0,
  });
  const { toast } = useToast();

  // Check admin authentication
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roles) {
          toast({
            title: "Access Denied",
            description: "You need admin privileges to access this page.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/auth");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAdmin();
  }, [navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      generateSitemap();
      fetchLastPublished();
    }
  }, [isAdmin]);

  const fetchLastPublished = async () => {
    try {
      // Try to get storage file metadata
      const { data: files } = await supabase.storage
        .from('sitemap')
        .list('', { limit: 1, search: 'sitemap.xml' });
      
      if (files && files.length > 0) {
        const file = files.find(f => f.name === 'sitemap.xml');
        if (file) {
          setLastPublished(file.updated_at || file.created_at);
        }
      }
      
      // Also check cache table for URL count
      const { data } = await supabase
        .from('sitemap_cache')
        .select('generated_at, url_count')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setPublishedUrlCount(data.url_count);
        if (!lastPublished) {
          setLastPublished(data.generated_at);
        }
      }
    } catch (error) {
      console.log("No previous sitemap found");
    }
  };

  const generateSitemap = async () => {
    try {
      setLoading(true);

      // Fetch sitemap config
      const { data: config } = await supabase
        .from("sitemap_config")
        .select("*")
        .single();

      const sitemapConfig: SitemapConfig = config || {
        base_url: "https://misti.services",
        include_games: true,
        include_products: true,
        include_blog: true,
        game_priority: 0.7,
        product_priority: 0.8,
        blog_priority: 0.6,
        static_page_priority: 0.8,
      };

      const urls: Array<{
        loc: string;
        lastmod?: string;
        changefreq?: string;
        priority?: number;
      }> = [];

      let counts = { games: 0, categories: 0, products: 0, blog: 0, static: 0 };

      // Add static pages
      const { data: staticPages } = await supabase
        .from("sitemap_static_pages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (staticPages) {
        staticPages.forEach((page) => {
          urls.push({
            loc: `${sitemapConfig.base_url}${page.url_path}`,
            changefreq: page.changefreq,
            priority: Number(page.priority),
            lastmod: formatDateISO(page.updated_at),
          });
          counts.static++;
        });
      }

      // Add games
      if (sitemapConfig.include_games) {
        const { data: games } = await supabase
          .from("games")
          .select("slug, updated_at")
          .eq("is_active", true);

        if (games) {
          games.forEach((game) => {
            urls.push({
              loc: `${sitemapConfig.base_url}/game/${game.slug}`,
              changefreq: "weekly",
              priority: Number(sitemapConfig.game_priority),
              lastmod: formatDateISO(game.updated_at),
            });
            counts.games++;
          });
        }
      }

      // Add category pages with structure: /game/{game}/{category}
      if (sitemapConfig.include_games) {
        const { data: categories } = await supabase
          .from("categories")
          .select(`
            slug,
            updated_at,
            game:games(slug)
          `)
          .eq("is_active", true);

        if (categories) {
          categories.forEach((category: any) => {
            if (category.game?.slug) {
              urls.push({
                loc: `${sitemapConfig.base_url}/game/${category.game.slug}/${category.slug}`,
                changefreq: "weekly",
                priority: 0.75,
                lastmod: formatDateISO(category.updated_at),
              });
              counts.categories++;
            }
          });
        }
      }

      // Add products with correct URL structure: /game/{game}/{category}/{product}
      if (sitemapConfig.include_products) {
        const { data: products } = await supabase
          .from("products")
          .select(`
            slug,
            updated_at,
            category:categories(
              slug,
              game:games(slug)
            )
          `)
          .eq("is_active", true);

        if (products) {
          products.forEach((product: any) => {
            if (product.category?.game?.slug && product.category?.slug) {
              urls.push({
                loc: `${sitemapConfig.base_url}/game/${product.category.game.slug}/${product.category.slug}/${product.slug}`,
                changefreq: "daily",
                priority: Number(sitemapConfig.product_priority),
                lastmod: formatDateISO(product.updated_at),
              });
              counts.products++;
            }
          });
        }
      }

      // Add blog posts
      if (sitemapConfig.include_blog) {
        const { data: posts } = await supabase
          .from("blog_posts")
          .select("slug, updated_at")
          .eq("is_published", true);

        if (posts) {
          posts.forEach((post) => {
            urls.push({
              loc: `${sitemapConfig.base_url}/blog/${post.slug}`,
              changefreq: "monthly",
              priority: Number(sitemapConfig.blog_priority),
              lastmod: formatDateISO(post.updated_at),
            });
            counts.blog++;
          });
        }
      }

      const xml = generateSitemapXml(urls);
      setSitemapXml(xml);
      setStats({
        ...counts,
        total: counts.games + counts.categories + counts.products + counts.blog + counts.static,
      });
    } catch (error) {
      console.error("Error generating sitemap:", error);
      toast({
        title: "Error",
        description: "Failed to generate sitemap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sitemapXml);
      toast({
        title: "Copied!",
        description: "Sitemap XML copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    downloadFile(sitemapXml, "sitemap.xml");
    toast({
      title: "Downloaded!",
      description: "Sitemap saved as sitemap.xml. Upload this file manually to your hosting.",
    });
  };

  const openStorageUrl = () => {
    window.open('https://kdjlhibxxygfdmlvdfcl.supabase.co/storage/v1/object/public/sitemap/sitemap.xml', '_blank');
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in as an admin to publish the sitemap.",
          variant: "destructive",
        });
        return;
      }

      // Convert XML string to Blob for upload
      const xmlBlob = new Blob([sitemapXml], { type: 'application/xml' });

      // Upload to storage bucket (upsert - replaces if exists)
      const { error: uploadError } = await supabase.storage
        .from('sitemap')
        .upload('sitemap.xml', xmlBlob, {
          contentType: 'application/xml',
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Also update the cache table for tracking
      await supabase.from('sitemap_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sitemap_cache').insert({
        xml_content: sitemapXml,
        url_count: stats.total,
        generated_by: user.id,
      });

      setLastPublished(new Date().toISOString());
      setPublishedUrlCount(stats.total);
      
      toast({
        title: "Published!",
        description: `Sitemap with ${stats.total} URLs is now live at /sitemap.xml`,
      });
    } catch (error) {
      console.error("Error publishing sitemap:", error);
      toast({
        title: "Error",
        description: "Failed to publish sitemap. Make sure you have admin permissions.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not admin (redirect happens in useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <SEO
        title="Sitemap Generator - misti.services"
        description="Generate and download XML sitemap for misti.services gaming boost services"
        canonical="/sitemap-generator"
        robots="noindex, nofollow"
      />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-1 pt-20">
          {/* Hero Section */}
          <section className="relative py-16 bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sitemap Generator
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Generate sitemap and copy to clipboard for manual update. Admin access only.
                </p>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Stats Cards */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors">
                    <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.products}</div>
                    <div className="text-xs text-muted-foreground">Products</div>
                  </Card>
                  
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors">
                    <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.games}</div>
                    <div className="text-xs text-muted-foreground">Games</div>
                  </Card>
                  
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors">
                    <Folder className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.categories}</div>
                    <div className="text-xs text-muted-foreground">Categories</div>
                  </Card>
                  
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors">
                    <Newspaper className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.blog}</div>
                    <div className="text-xs text-muted-foreground">Blog Posts</div>
                  </Card>
                  
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors">
                    <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.static}</div>
                    <div className="text-xs text-muted-foreground">Static Pages</div>
                  </Card>
                  
                  <Card className="p-4 text-center border-primary/20 hover:border-primary/40 transition-colors bg-primary/5">
                    <Globe className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total URLs</div>
                  </Card>
                </div>
              )}

              {/* Primary Action - Copy to Clipboard */}
              <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                <div className="flex flex-col gap-4">
                  <div className="text-center md:text-left">
                    <h3 className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                      <Copy className="w-6 h-6 text-green-500" />
                      Update Sitemap (Static File)
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Copy the XML content below and paste it into <code className="bg-muted px-1 rounded">public/sitemap.xml</code> file.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button
                      size="lg"
                      onClick={handleCopy}
                      disabled={loading || !sitemapXml}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Copy className="w-5 h-5 mr-2" />
                      Copy Full XML ({stats.total} URLs)
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDownload}
                      disabled={loading || !sitemapXml}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download File
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={generateSitemap}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Regenerate
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-2 space-y-2">
                    <p><strong>How to update:</strong></p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click "Copy Full XML" above</li>
                      <li>Go to Lovable Code Editor → public/sitemap.xml</li>
                      <li>Replace all content with copied XML</li>
                      <li>Save and deploy</li>
                    </ol>
                  </div>
                </div>
              </Card>

              {/* Sitemap Preview */}
              <Card className="p-6 space-y-4">
                <h2 className="text-2xl font-bold">XML Preview</h2>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs border border-border max-h-80 overflow-y-auto">
                    <code className="text-foreground">{sitemapXml}</code>
                  </pre>
                )}
              </Card>

              {/* Info Section */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Static Sitemap Info
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    The sitemap is served as a static file from <code className="bg-muted px-1 rounded">public/sitemap.xml</code>.
                  </p>
                  <p>
                    To update it, copy the generated XML and paste it into the file via Lovable's code editor.
                  </p>
                  <p className="font-medium text-foreground mt-4">
                    Live URL: <a href="https://misti.services/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://misti.services/sitemap.xml</a>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SitemapGenerator;
