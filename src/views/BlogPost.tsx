import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import Breadcrumb from "@/components/Breadcrumb";
import ReadingProgress from "@/components/blog/ReadingProgress";
import BlogPostSidebar from "@/components/blog/BlogPostSidebar";
import SafeContentRenderer from "@/components/blog/SafeContentRenderer";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signalPrerenderReady } from "@/lib/prerender";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  is_published?: boolean;
  is_legal_page?: boolean;
  excerpt?: string;
  meta_description?: string;
  meta_keywords?: string;
  featured_image?: string;
  author_name?: string;
  read_time_minutes?: number;
  canonical_url?: string;
}

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isUnpublishedLegalPage, setIsUnpublishedLegalPage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  // Add IDs to headings for table of contents navigation
  useEffect(() => {
    if (post?.content) {
      const articleElement = document.querySelector('article .prose');
      if (articleElement) {
        const headings = articleElement.querySelectorAll('h2, h3');
        headings.forEach((heading, index) => {
          heading.id = `heading-${index}`;
        });
      }
    }
  }, [post?.content]);

  // Signal prerender ready when post is loaded
  useEffect(() => {
    if (!loading && post) {
      // Using 500ms for blog posts with rich content
      const timer = setTimeout(() => {
        signalPrerenderReady({ requireStructuredData: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, post]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, content, created_at, is_published, is_legal_page, excerpt, meta_description, meta_keywords, featured_image, author_name, read_time_minutes, canonical_url")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      navigate("/404");
    } else if (!data.is_published && data.is_legal_page) {
      setIsUnpublishedLegalPage(true);
      setPost(null);
    } else if (!data.is_published) {
      navigate("/404");
    } else {
      setIsUnpublishedLegalPage(false);
      setPost(data);
    }
    setLoading(false);
  };

  const structuredData = post ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "image": post.featured_image || "",
    "datePublished": post.created_at,
    "dateModified": post.created_at,
    "author": {
      "@type": "Person",
      "name": post.author_name || "misti.services Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "misti.services",
      "logo": {
        "@type": "ImageObject",
        "url": "https://misti.services/logo.png"
      }
    },
    "description": post.meta_description || post.excerpt || "",
    "wordCount": post.content.split(/\s+/).length,
    ...(post.read_time_minutes && { "timeRequired": `PT${post.read_time_minutes}M` })
  } : null;

  const hasPostData = !loading && post;

  const createFallbackTitle = () => {
    const postTitle = slug?.replace(/-/g, ' ')
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Blog Post';
    return `${postTitle} | Blog | misti.services`;
  };

  const createFallbackDescription = () => {
    const postTitle = slug?.replace(/-/g, ' ') || 'blog post';
    return `Read our article about ${postTitle}. Gaming news, guides, and tips from misti.services.`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={hasPostData ? `${post.title} | misti.services` : createFallbackTitle()}
        description={hasPostData ? (post.meta_description || post.excerpt || `Expert gaming insights: ${post.title}. Learn strategies to enhance your gaming experience.`) : createFallbackDescription()}
        canonical={`/blog/${slug}`}
        ogImage={hasPostData ? post.featured_image : undefined}
        keywords={hasPostData ? (post.meta_keywords || `${post.title}, gaming blog, boost services, gaming guides`) : `gaming blog, ${slug?.replace(/-/g, ' ')}`}
        ogType={hasPostData ? "article" : "website"}
        articlePublishedTime={hasPostData ? post.created_at : undefined}
        articleModifiedTime={hasPostData ? post.created_at : undefined}
        articleAuthor={hasPostData ? (post.author_name || "misti.services Team") : undefined}
        structuredData={hasPostData ? [
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://misti.services" },
              { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://misti.services/blog" },
              { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://misti.services/blog/${post.slug}` }
            ]
          },
          structuredData
        ].filter(Boolean) : undefined}
      />
      <ReadingProgress />
      <Navigation />

      <main className="container mx-auto px-4 py-12 mt-20">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: loading ? "Loading..." : post?.title || "" }
          ]} />

          <Link to="/blog">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            {/* Main Content */}
            <article>
              {loading ? (
                <>
                  <Skeleton className="h-12 w-3/4 mb-4" />
                  <Skeleton className="h-6 w-1/2 mb-8" />
                  <Skeleton className="h-64 w-full" />
                </>
              ) : isUnpublishedLegalPage ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                  <h1 className="text-3xl font-bold mb-3">Legal page is not published yet</h1>
                  <p className="text-muted-foreground mb-6">
                    This legal page exists, but it is currently unpublished.
                  </p>
                  <Link to="/blog">
                    <Button variant="outline">Back to Blog</Button>
                  </Link>
                </div>
              ) : post ? (
                <>
                  <h1 className="text-5xl font-bold mb-6 leading-tight">
                    {post.title}
                  </h1>
                  
                  <div className="flex items-center gap-6 text-muted-foreground mb-8 pb-8 border-b">
                    {post.author_name && (
                      <span className="text-foreground font-medium">
                        By {post.author_name}
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {post.read_time_minutes && (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {post.read_time_minutes} min read
                      </span>
                    )}
                  </div>
                  
                  <SafeContentRenderer 
                    content={post.content}
                    className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground/90 prose-p:leading-relaxed prose-strong:text-foreground prose-li:text-foreground/90 prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-lg prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded"
                  />
                </>
              ) : null}
            </article>

            {/* Sidebar */}
            {!loading && post && (
              <aside className="hidden lg:block">
                <BlogPostSidebar 
                  content={post.content} 
                  url={`/blog/${post.slug}`}
                  title={post.title}
                  authorName={post.author_name}
                />
              </aside>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
