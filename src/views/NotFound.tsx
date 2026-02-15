import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { isGonePath } from "@/lib/gonePatterns";
import { supabase } from "@/integrations/supabase/client";
import { Home, Search, ArrowLeft, BookOpen, MessageCircle, Users } from "lucide-react";
import { signalPrerenderReady } from "@/lib/prerender";
import { env } from "@/lib/env";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkRedirectsAndGone = async () => {
      const pathname = location.pathname;
      
      try {
        // First check for redirects via the API
        const redirectCheckUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-redirects?path=${encodeURIComponent(pathname)}&checkGone=true&incrementHit=true`;
        const response = await fetch(redirectCheckUrl, {
          headers: {
            'apikey': env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // If there's a redirect, perform it
          if (data.redirect) {
            const destination = data.redirect.destination;
            if (destination.startsWith("http://") || destination.startsWith("https://")) {
              window.location.replace(destination);
            } else {
              window.location.replace(window.location.origin + destination);
            }
            return;
          }
          
          // If it's a gone page, navigate there
          if (data.isGone) {
            console.log('Redirecting to 410 Gone page:', pathname);
            navigate('/gone', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking redirects:', error);
      }
      
      // Fallback: check gone patterns locally
      if (isGonePath(pathname)) {
        console.log("Redirecting to 410 Gone page (pattern match):", pathname);
        navigate('/gone', { replace: true });
        return;
      }
      
      // Fallback: check deleted_urls table directly
      const { data } = await supabase
        .from('deleted_urls')
        .select('url_path')
        .eq('url_path', pathname)
        .maybeSingle();
      
      if (data) {
        console.log('Redirecting to 410 Gone page (deleted content):', pathname);
        navigate('/gone', { replace: true });
        return;
      }
      
      console.error("404 Error: User attempted to access non-existent route:", pathname);
      
      // Signal to prerender services that the page is ready
      signalPrerenderReady();
    };
    
    checkRedirectsAndGone();
  }, [location.pathname, navigate]);

  const quickLinks = [
    { to: "/", label: "Homepage", icon: Home, description: "Start fresh from home" },
    { to: "/blog", label: "Blog", icon: BookOpen, description: "Read our articles" },
    { to: "/about-us", label: "About Us", icon: Users, description: "Learn about us" },
    { to: "/contact-us", label: "Contact", icon: MessageCircle, description: "Get in touch" },
  ];

  return (
    <>
      <SEO 
        title="404 - Page Not Found | misti.services"
        description="The page you're looking for doesn't exist or has been moved. Return to our homepage to find what you need."
        noindex={true}
        robots="noindex, nofollow"
      />
      {/* HTTP Status Code hint for prerender services */}
      <div 
        dangerouslySetInnerHTML={{ __html: '<!-- response:status-code=404 -->' }}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
          <div className="text-center max-w-2xl w-full">
            {/* Large 404 Display */}
            <div className="relative mb-8">
              <h1 className="text-[8rem] sm:text-[12rem] font-black bg-gradient-to-b from-primary/30 to-primary/5 bg-clip-text text-transparent leading-none select-none">
                404
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/20">
                  <Search className="h-10 w-10 sm:h-14 sm:w-14 text-primary" />
                </div>
              </div>
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
              Page Not Found
            </h2>
            <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
              The page you're looking for doesn't exist, has been moved, or is temporarily unavailable.
            </p>
            
            {/* Requested URL Card */}
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-5 mb-8 border border-border/50 shadow-xl max-w-md mx-auto">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Requested URL</p>
              <code className="text-sm text-primary font-mono break-all bg-primary/5 px-3 py-1.5 rounded-lg inline-block">
                {location.pathname}
              </code>
            </div>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate(-1)}
                className="gap-2 border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Link to="/">
                <Button variant="hero" size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/25">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Button>
              </Link>
            </div>
            
            {/* Quick Links Grid */}
            <div className="border-t border-border/30 pt-10">
              <p className="text-sm text-muted-foreground mb-6 font-medium">Quick Navigation</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="group p-4 rounded-xl bg-card/40 hover:bg-card/80 border border-border/30 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <link.icon className="h-5 w-5 text-primary mb-2 mx-auto group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{link.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-10 p-5 rounded-xl bg-muted/30 border border-border/30">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Need help finding something? <Link to="/contact" className="text-primary hover:underline underline-offset-4">Contact our support team</Link>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default NotFound;
