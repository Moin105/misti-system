import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import Breadcrumb from "@/components/Breadcrumb";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { signalPrerenderReady } from "@/lib/prerender";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  color: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  created_at: string;
  featured_image?: string | null;
  author_name?: string | null;
  read_time_minutes?: number | null;
  category_id?: string | null;
  blog_categories?: BlogCategory | null;
}

interface BlogCategoryWithCount extends BlogCategory {
  post_count?: number;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategoryWithCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  // Signal prerender ready when data is loaded
  useEffect(() => {
    if (!loading && posts.length >= 0) {
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, posts]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("blog_categories")
      .select("id, name, slug, icon_name, color")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    
    if (data) {
      // Count posts per category
      const categoriesWithCount = await Promise.all(
        data.map(async (cat) => {
          const { count } = await supabase
            .from("blog_posts")
            .select("*", { count: "exact", head: true })
            .eq("is_published", true)
            .eq("is_legal_page", false)
            .eq("category_id", cat.id);
          
          return { ...cat, post_count: count || 0 };
        })
      );
      setCategories(categoriesWithCount);
    }
  };

  const fetchPosts = async () => {
    // Fetch posts with joined category data to avoid N+1 queries
    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        id, title, slug, excerpt, created_at, featured_image, author_name, read_time_minutes, category_id,
        blog_categories(id, name, slug, icon_name, color)
      `)
      .eq("is_published", true)
      .eq("is_legal_page", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const filteredPosts = selectedCategory === "all" 
    ? posts 
    : posts.filter(post => post.category_id === selectedCategory);

  const renderCategoryIcon = (iconName: string | null) => {
    if (!iconName) return <BookOpen className="w-4 h-4" />;
    return <DynamicIcon name={iconName} className="w-4 h-4" />;
  };

  // Build structured data only when posts are loaded
  const blogStructuredData = !loading && posts.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "misti.services Blog",
    "description": "Gaming boost services news, game updates, and professional boosting guides",
    "url": "https://misti.services/blog",
    "blogPost": posts.map(post => {
      const postCategory = post.blog_categories;
      return {
        "@type": "BlogPosting",
        "headline": post.title,
        "url": `https://misti.services/blog/${post.slug}`,
        "datePublished": post.created_at,
        "description": post.excerpt || "",
        ...(post.featured_image && { "image": post.featured_image }),
        ...(post.author_name && { "author": { "@type": "Person", "name": post.author_name } }),
        ...(postCategory && { "articleSection": postCategory.name })
      };
    })
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Blog - Gaming Tips, Guides & News | misti.services"
        description="Expert gaming guides, boost service tips, and industry news. Learn from professional players and enhance your gaming experience."
        canonical="/blog"
        keywords="gaming blog, boost guides, game updates, gaming news, professional boosting"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://misti.services"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://misti.services/blog"
              }
            ]
          },
          ...(blogStructuredData ? [blogStructuredData] : [])
        ]}
      />
      <Navigation />
      <BlogHero />
      <main className="container mx-auto px-4 pb-24">
        <div className="max-w-7xl mx-auto pt-4">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Blog" }
          ]} />

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mt-8">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                All Posts
                <Badge variant="secondary" className="ml-2">
                  {posts.length}
                </Badge>
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="data-[state=active]:text-primary-foreground"
                  style={{
                    backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                  } as React.CSSProperties}
                >
                  {renderCategoryIcon(cat.icon_name)}
                  <span className="ml-2">{cat.name}</span>
                  <Badge 
                    variant="secondary" 
                    className="ml-2"
                  >
                    {cat.post_count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </Card>
                  ))
                ) : filteredPosts.length === 0 ? (
                  <div className="col-span-full">
                    <Card className="p-12">
                      <CardContent className="flex flex-col items-center justify-center text-center">
                        <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {selectedCategory === "all" ? "No blog posts yet" : "No posts in this category"}
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedCategory === "all" 
                            ? "Check back soon for exciting gaming content and guides!" 
                            : "Try selecting a different category or check back later."}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <BlogPostCard 
                      key={post.id} 
                      {...post} 
                      category={post.blog_categories || undefined}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
