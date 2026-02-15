import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { signalPrerenderReady } from "@/lib/prerender";
import { Home, ShieldX, ArrowLeft, Lock, LogIn, MessageCircle } from "lucide-react";

const Forbidden = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("403 Forbidden: Access denied to:", location.pathname);
    
    // Signal to prerender services that the page is ready
    const timer = setTimeout(() => {
      signalPrerenderReady();
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const possibleReasons = [
    { icon: Lock, text: "You don't have permission to access this resource" },
    { icon: LogIn, text: "You may need to log in or use a different account" },
    { icon: ShieldX, text: "The resource is restricted or protected" },
  ];

  return (
    <>
      <SEO 
        title="403 - Access Forbidden | misti.services"
        description="You don't have permission to access this page. Please log in or contact support if you believe this is an error."
        noindex={true}
        robots="noindex, nofollow"
      />
      {/* HTTP Status Code hint for prerender services */}
      <div 
        dangerouslySetInnerHTML={{ __html: '<!-- response:status-code=403 -->' }}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-destructive/10 rounded-full blur-3xl opacity-40" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
          <div className="text-center max-w-2xl w-full">
            {/* Large 403 Display */}
            <div className="relative mb-8">
              <h1 className="text-[8rem] sm:text-[12rem] font-black bg-gradient-to-b from-red-500/30 to-destructive/10 bg-clip-text text-transparent leading-none select-none">
                403
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-xl border border-red-500/20 shadow-2xl shadow-red-500/10">
                  <ShieldX className="h-10 w-10 sm:h-14 sm:w-14 text-red-500" />
                </div>
              </div>
            </div>
            
            {/* Error Message */}
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
              Access Forbidden
            </h2>
            <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
              You don't have permission to access this page or resource.
            </p>
            
            {/* Requested URL Card */}
            <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-5 mb-8 border border-red-500/20 shadow-xl max-w-md mx-auto">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Requested URL</p>
              <code className="text-sm text-red-500 font-mono break-all bg-red-500/5 px-3 py-1.5 rounded-lg inline-block">
                {location.pathname}
              </code>
            </div>

            {/* Possible Reasons */}
            <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-6 mb-8 border border-border/30 max-w-lg mx-auto">
              <p className="text-sm font-medium text-foreground mb-4">This might be happening because:</p>
              <ul className="space-y-3">
                {possibleReasons.map((reason, index) => (
                  <li key={index} className="flex items-center gap-3 text-left">
                    <div className="p-1.5 rounded-lg bg-red-500/10">
                      <reason.icon className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">{reason.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
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

            {/* Login & Support Links */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 hover:underline underline-offset-4">
                <LogIn className="h-4 w-4" />
                Sign in to your account
              </Link>
              <span className="hidden sm:inline text-border">|</span>
              <Link to="/contact" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 hover:underline underline-offset-4">
                <MessageCircle className="h-4 w-4" />
                Contact Support
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Forbidden;
