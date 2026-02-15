import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Mail } from "lucide-react";
import { DynamicIcon, getIconByName } from "@/components/DynamicIcon";
import discordHeroImage from "@/assets/discord-hero.jpg";
import contactBgImage from "@/assets/contact-bg.jpg";
import { signalPrerenderReady } from "@/lib/prerender";

interface ContentBlock {
  type: string;
  heading?: string;
  subheading?: string;
  description?: string;
  content?: string;
}

interface PageData {
  title: string;
  subtitle: string;
  content: ContentBlock[];
}

interface DiscordConfig {
  discord_url: string;
  heading: string;
  description: string;
}

interface ContactInfo {
  id: string;
  label: string;
  value: string;
  icon_name: string;
  contact_type: string;
}

const ContactUs = () => {
  const [discordConfig, setDiscordConfig] = useState<DiscordConfig | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // Signal prerender ready when data is loaded
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        signalPrerenderReady();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      const [discordResponse, contactResponse] = await Promise.all([
        supabase
          .from("discord_config")
          .select("*")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("contact_info")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
      ]);

      if (discordResponse.data) {
        setDiscordConfig(discordResponse.data);
      }
      
      if (contactResponse.data) {
        setContactInfo(contactResponse.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordClick = () => {
    if (discordConfig?.discord_url) {
      window.open(discordConfig.discord_url, "_blank");
    }
  };

  const getIcon = (iconName: string) => {
    return getIconByName(iconName) || Mail;
  };

  const getContactColor = (type: string) => {
    const colors: Record<string, string> = {
      email: "text-blue-500",
      phone: "text-green-500",
      address: "text-purple-500",
      social: "text-pink-500",
      default: "text-primary"
    };
    return colors[type] || colors.default;
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
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Contact Us - Get Support & Exclusive Deals | misti.services"
        description="Contact misti.services on Discord for personalized gaming boost support, exclusive deals, and 24/7 customer service. Join our community today!"
        canonical="/contact-us"
        keywords="contact misti.services, gaming boost support, Discord support, customer service, gaming help, misti services contact"
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
              "name": "Contact Us",
              "item": "https://misti.services/contact-us"
            }
          ]
        }}
      />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          {/* Section 1: Discord CTA */}
          {discordConfig && (
            <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-br from-[#5865F2]/10 via-background to-background">
              <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Discord Image */}
                    <div className="order-2 lg:order-1">
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <img 
                          src={discordHeroImage} 
                          alt="Join our Discord community"
                          className="w-full h-auto"
                        />
                      </div>
                    </div>

                    {/* Discord Content */}
                    <div className="order-1 lg:order-2 space-y-6">
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                        {discordConfig.heading}
                      </h1>
                      
                      <div className="text-lg text-muted-foreground space-y-4">
                        {discordConfig.description.split('\n\n').map((paragraph, idx) => (
                          paragraph.trim() && <p key={idx}>{paragraph}</p>
                        ))}
                      </div>

                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto text-lg px-8 py-6 bg-[hsl(235,86%,65%)] hover:bg-[hsl(235,60%,55%)]"
                        onClick={handleDiscordClick}
                      >
                        <MessageCircle className="w-6 h-6 mr-3" />
                        Join Our Discord Server
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Contact Information - WoW Themed */}
          {contactInfo.length > 0 && (
            <section className="relative py-32 overflow-hidden">
              {/* Background with WoW Inn Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${contactBgImage})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95" />
              </div>

              <div className="container relative z-10 mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                      Other Ways to Reach Us
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Choose your preferred method of communication
                    </p>
                  </div>

                  {/* Modern Contact Cards with Glass Effect */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {contactInfo.map((contact, index) => {
                      const Icon = getIcon(contact.icon_name);
                      const colorClass = getContactColor(contact.contact_type);
                      
                      return (
                        <div
                          key={contact.id}
                          className="group relative"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {/* Glow Effect */}
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                          
                          {/* Card */}
                          <Card className="relative h-full p-8 backdrop-blur-sm bg-card/90 border-2 border-border/50 hover:border-primary/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl">
                            <div className="flex flex-col items-center text-center space-y-6">
                              {/* Icon with Animated Background */}
                              <div className="relative">
                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500`}>
                                  <Icon className={`w-10 h-10 ${colorClass} drop-shadow-lg`} />
                                </div>
                                {/* Decorative corner accent */}
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                              </div>
                              
                              {/* Content */}
                              <div className="space-y-3">
                                <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                                  {contact.label}
                                </h3>
                                <p className="text-muted-foreground break-words leading-relaxed">
                                  {contact.value}
                                </p>
                              </div>

                              {/* Decorative bottom line */}
                              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                </div>
              </div>
            </section>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ContactUs;
