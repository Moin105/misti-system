import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { signalPrerenderReady } from "@/lib/prerender";
import { Home, Trash2, BookOpen, ShoppingBag, AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface DeletedInfo {
  content_type: string;
  original_title: string;
  deleted_at: string;
}

const Gone = () => {
  const location = useLocation();
  const [deletedInfo, setDeletedInfo] = useState<DeletedInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeletedInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('deleted_urls')
          .select('content_type, original_title, deleted_at')
          .eq('url_path', location.pathname)
          .maybeSingle();
        
        if (data) {
          setDeletedInfo(data);
        }
        
        if (error) {
          console.error('Error fetching deleted content info:', error);
        }
      } catch (err) {
        console.error('Error fetching deleted content info:', err);
      } finally {
        setLoading(false);
      }
      
      console.log("410 Gone: Page permanently removed:", location.pathname);
    };
    
    fetchDeletedInfo();
  }, [location.pathname]);

  // Signal to prerender services when page is ready
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'product': 'Product',
      'blog_post': 'Blog Post',
      'page': 'Page',
      'category': 'Category',
      'game': 'Game',
    };
    return labels[type] || type.replace('_', ' ');
  };

  const getAlternativeLink = () => {
    if (deletedInfo?.content_type === 'product' || deletedInfo?.content_type === 'category') {
      return { to: '/', label: 'Browse All Products', icon: ShoppingBag };
    }
    if (deletedInfo?.content_type === 'blog_post') {
      return { to: '/blog', label: 'Read Our Blog', icon: BookOpen };
    }
    return null;
  };

  const alternativeLink = getAlternativeLink();

  return (
    <>
      <SEO 
        title="410 - Content Permanently Removed | misti.services"
        description="This content has been permanently removed and is no longer available. The resource you requested will not be returning."
        noindex={true}
        robots="noindex, nofollow"
      />
      {/* HTTP Status Code hint for prerender services */}
      <div 
        dangerouslySetInnerHTML={{ __html: '<!-- response:status-code=410 -->' }}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-destructive/10 rounded-full blur-3xl opacity-40" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
          <div className="text-center max-w-2xl w-full">
            {/* Large 410 Display */}
            <div className="relative mb-8">
              <h1 className="text-[8rem] sm:text-[12rem] font-black bg-gradient-to-b from-orange-500/30 to-destructive/10 bg-clip-text text-transparent leading-none select-none">
                410
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-xl border border-orange-500/20 shadow-2xl shadow-orange-500/10">
                  <Trash2 className="h-10 w-10 sm:h-14 sm:w-14 text-orange-500" />
                </div>
              </div>
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
              Content Permanently Removed
            </h2>
            
            {/* Dynamic Content Info */}
            {!loading && deletedInfo && (
              <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-orange-500/20 shadow-xl max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="px-3 py-1 text-xs font-medium bg-orange-500/10 text-orange-500 rounded-full uppercase tracking-wider">
                    {getContentTypeLabel(deletedInfo.content_type)}
                  </span>
                </div>
                {deletedInfo.original_title && (
                  <p className="text-foreground font-medium mb-2">"{deletedInfo.original_title}"</p>
                )}
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Removed on {format(new Date(deletedInfo.deleted_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            )}
            
            {!deletedInfo && !loading && (
              <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
                The page you're looking for has been permanently removed and will not be returning.
              </p>
            )}

            {/* Explanation Card */}
            <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-5 mb-8 border border-border/30 max-w-lg mx-auto">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground mb-1">What does this mean?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This content has been intentionally removed and will not be coming back. 
                    This happens when we restructure our website or retire outdated content.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/">
                <Button variant="hero" size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/25">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Button>
              </Link>
              {alternativeLink && (
                <Link to={alternativeLink.to}>
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto border-border/50 hover:border-primary/30">
                    <alternativeLink.icon className="h-4 w-4" />
                    {alternativeLink.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Helpful Links */}
            <div className="border-t border-border/30 pt-8">
              <p className="text-sm text-muted-foreground mb-4">Looking for something specific?</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link to="/" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4 flex items-center gap-1">
                  Homepage <ArrowRight className="h-3 w-3" />
                </Link>
                <Link to="/blog" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4 flex items-center gap-1">
                  Blog <ArrowRight className="h-3 w-3" />
                </Link>
                <Link to="/about-us" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4 flex items-center gap-1">
                  About Us <ArrowRight className="h-3 w-3" />
                </Link>
                <Link to="/contact-us" className="text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4 flex items-center gap-1">
                  Contact Us <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Gone;
