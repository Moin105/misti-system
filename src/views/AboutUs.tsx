import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { Shield, Zap, Users, Clock, LucideIcon, Building2, MapPin } from "lucide-react";
import * as LucideIcons from "lucide-react";
import aboutHeroImageSrc from "@/assets/about-hero.jpg";
import aboutTeamImageSrc from "@/assets/about-team.jpg";

// Ensure images are string URLs
const aboutHeroImage = typeof aboutHeroImageSrc === 'string' ? aboutHeroImageSrc : (aboutHeroImageSrc as any)?.default || (aboutHeroImageSrc as any)?.src || String(aboutHeroImageSrc);
const aboutTeamImage = typeof aboutTeamImageSrc === 'string' ? aboutTeamImageSrc : (aboutTeamImageSrc as any)?.default || (aboutTeamImageSrc as any)?.src || String(aboutTeamImageSrc);
import { sanitizeHtml } from "@/lib/sanitize";
import { signalPrerenderReady } from "@/lib/prerender";
import { useLazyLoad } from "@/hooks/useLazyLoad";

interface ContentBlock {
  type: string;
  heading?: string;
  subheading?: string;
  description?: string;
  content?: string;
  items?: any[];
}

interface PageData {
  title: string;
  subtitle: string;
  content: ContentBlock[];
}

interface AboutStat {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

// Lazy-loaded Company Information Section
const LazyCompanyInfoSection = () => {
  const { ref, isVisible } = useLazyLoad({ rootMargin: "200px" });
  
  return (
    <div ref={ref}>
      {isVisible && (
        <section className="py-20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-muted/30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                {/* Outer glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
                
                <div className="relative bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl rounded-3xl p-10 border border-border/50 shadow-2xl">
                  {/* Header with icon */}
                  <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/50">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="h-8 w-8 text-accent drop-shadow-[0_0_8px_rgba(76,134,198,0.5)]" />
                    </div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      Company Information
                    </h2>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-6">
                    {/* Company name */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-300">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-xl mb-1">Masterloot Solutions LLC</p>
                        <p className="text-sm text-muted-foreground">Registered & Licensed Company</p>
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-300">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg mb-2">Corporate Address</p>
                        <div className="space-y-1 text-muted-foreground">
                          <p>30 North Gould Street</p>
                          <p>Sheridan, WY 82801</p>
                          <p>United States</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                      <p className="text-muted-foreground leading-relaxed">
                        We are a legally registered and operating company in the United States, 
                        committed to providing legitimate and trustworthy services to the World of Warcraft community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const AboutUs = () => {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [stats, setStats] = useState<AboutStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPageData();
    fetchStats();
  }, []);

  // Signal prerender ready when data is loaded
  useEffect(() => {
    if (!loading && pageData) {
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, pageData]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("about_stats")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchPageData = async () => {
    try {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", "about-us")
        .eq("is_published", true)
        .single();

      if (error) throw error;
      setPageData(data as unknown as PageData);
    } catch (error) {
      console.error("Error fetching page:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string): LucideIcon => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || Shield;
  };

  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "hero":
        return (
          <section key={index} className="relative py-24 overflow-hidden">
            {/* Modern gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(76,134,198,0.1),transparent_40%)]" />
            
            <div className="container relative z-10 mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
                {block.subheading && (
                  <div className="inline-block">
                    <span className="px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold tracking-wider uppercase backdrop-blur-sm">
                      {block.subheading}
                    </span>
                  </div>
                )}
                <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
                  {block.heading}
                </h2>
                {block.description && (
                  <p 
                    className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.description) }} 
                  />
                )}
              </div>
            </div>
          </section>
        );

      case "content":
        return (
          <section key={index} className="py-20 relative">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="relative">
                  {/* Decorative line */}
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-transparent rounded-full" />
                  
                  <div className="animate-fade-in">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {block.heading}
                    </h2>
                    <div 
                      className="prose prose-lg max-w-none text-muted-foreground leading-relaxed prose-headings:text-foreground prose-headings:font-bold prose-p:mb-6 prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-accent"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content || "") }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case "features":
        return (
          <section key={index} className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background to-muted/20" />
            
            <div className="container relative z-10 mx-auto px-4">
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent animate-fade-in">
                {block.heading}
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {block.items?.map((item, idx) => {
                  const Icon = getIcon(item.icon);
                  return (
                    <div 
                      key={idx} 
                      className="group relative animate-scale-in hover-scale"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="relative h-full bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-accent/50 transition-all duration-300 shadow-lg hover:shadow-accent/10">
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative space-y-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icon className="w-7 h-7 text-accent drop-shadow-[0_0_8px_rgba(76,134,198,0.3)]" />
                          </div>
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                            {item.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed text-sm">
                            {item.description}
                          </p>
                        </div>
                        
                        {/* Decorative corner */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case "stats":
        // Skip rendering - using dynamic stats from database instead
        return null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24">
          <div className="h-12 bg-muted/30 rounded animate-pulse w-64 mb-4"></div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Page not found</p>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="About Us - Professional Gaming Boost Services | misti.services"
        description="Learn about misti.services - Trusted gaming boost services since 2013. Professional team, 5.0 TrustScore, serving thousands of gamers worldwide."
        canonical="/about-us"
        keywords="misti.services, gaming boost company, professional gaming services, trusted boost vendor, about misti services, gaming service provider, Masterloot Solutions"
        structuredData={{
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
              "name": "About Us",
              "item": "https://misti.services/about-us"
            }
          ]
        }}
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-grow">
          {/* Modern Hero Section with Animated Background */}
          <section className="relative py-40 overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${aboutHeroImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(76,134,198,0.1),transparent_50%)]" />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
            
            <div className="container relative z-10 mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
                <div className="inline-block">
                  <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold tracking-wider uppercase backdrop-blur-sm">
                    About Us
                  </span>
                </div>
                <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
                  {pageData.title}
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  {pageData.subtitle}
                </p>
              </div>
            </div>
          </section>

          {/* Modern Stats Section with Cards */}
          {stats.length > 0 && (
            <section className="py-20 relative">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {stats.map((stat, index) => (
                    <div 
                      key={stat.id} 
                      className="group relative animate-scale-in hover-scale"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-accent/50 transition-all duration-300 shadow-lg hover:shadow-accent/20">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <div className="relative text-center space-y-3">
                          <div className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-accent via-primary to-accent bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(76,134,198,0.3)] animate-fade-in">
                            {stat.value}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {stat.label}
                          </div>
                        </div>
                        
                        {/* Decorative corner accent */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Modern Team Image Section with Frame */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="relative group">
                  {/* Decorative frame */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50" />
                  
                  <div className="relative overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
                    <img 
                      src={aboutTeamImage} 
                      alt="Our community and team"
                      className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CMS Content Blocks */}
          {pageData.content.map((block, index) => renderContentBlock(block, index))}

          {/* Modern Company Information Section - Lazy Loaded */}
          <LazyCompanyInfoSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AboutUs;
