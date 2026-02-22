import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, ShieldCheck, BadgeCheck, Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle } from "lucide-react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useDeferredFooterData } from "@/hooks/useDeferredFooterData";
import mistiLogoSrc from "@/assets/misti-logo.png";
import logoOptimizedSrc from "@/assets/logo-optimized.png";
import logoSrc from "@/assets/logo.png";

// Ensure logo is a string URL
const mistiLogo = typeof mistiLogoSrc === 'string' ? mistiLogoSrc : (mistiLogoSrc as any)?.default || (mistiLogoSrc as any)?.src || String(mistiLogoSrc);
import { DynamicIcon } from "@/components/DynamicIcon";

// Direct icon map for social icons to avoid async loading issues
const socialIconMap: Record<string, React.ComponentType<any>> = {
  'Facebook': Facebook,
  'Instagram': Instagram,
  'Twitter': Twitter,
  'Youtube': Youtube,
  'Linkedin': Linkedin,
  'MessageCircle': MessageCircle,
};

const Footer = () => {
  const { openPreferences } = useCookieConsent();
  const [showStripeIframe, setShowStripeIframe] = useState(false);
  const [footerLogo, setFooterLogo] = useState(mistiLogo);
  const [logoFallbackIdx, setLogoFallbackIdx] = useState(0);

  const stripeRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

  // Deferred footer data - only fetches when footer is near viewport
  const { footerData, observerRef } = useDeferredFooterData();

  const sections = footerData?.sections || [];
  const socialLinks = footerData?.socialLinks || [];

  // Lazy load Stripe iframe when it comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === stripeRef.current) {
            setShowStripeIframe(true);
          }
        });
      },
      { rootMargin: "100px" },
    );

    if (stripeRef.current) observer.observe(stripeRef.current);

    return () => observer.disconnect();
  }, []);

  const renderIcon = (iconName: string, platform?: string, url?: string) => {
    const candidates = [iconName, platform, url].filter(Boolean).join(" ").toLowerCase();

    const socialAliases: Array<{ test: RegExp; icon: string }> = [
      { test: /facebook|fb/, icon: "Facebook" },
      { test: /instagram|insta/, icon: "Instagram" },
      { test: /twitter|x\.com/, icon: "Twitter" },
      { test: /youtube|youtu\.be/, icon: "Youtube" },
      { test: /linkedin/, icon: "Linkedin" },
      { test: /discord/, icon: "MessageCircle" },
    ];

    const matched = socialAliases.find((entry) => entry.test.test(candidates));
    const finalName = matched?.icon || (iconName || platform || "").trim();

    // Try direct icon first (synchronous, no async loading)
    const DirectIcon = socialIconMap[finalName];
    if (DirectIcon) {
      return <DirectIcon className="w-5 h-5 text-white" strokeWidth={2} />;
    }
    
    // Fallback to DynamicIcon for other icons
    return <DynamicIcon name={finalName} className="w-5 h-5 text-white" color="#ffffff" strokeWidth={2} />;
  };

  return (
    <footer
      ref={observerRef}
      className="relative border-t-2 border-transparent bg-gradient-to-b from-card/80 to-card/50 border-gradient-blue-purple"
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Payment Methods */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8 pb-8 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-medium">Secure Payment Methods</span>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {["MASTERCARD", "VISA", "PAYPAL", "STRIPE"].map((method) => (
              <div 
                key={method}
                className="px-4 py-2 rounded-lg bg-gradient-to-br from-white/10 to-white/5 
                           border border-white/10 hover:border-blue-500/40
                           hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]
                           text-xs font-semibold transition-all duration-300 cursor-default"
              >
                {method}
              </div>
            ))}
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:justify-between gap-8 mb-8">
          {/* Company Info with Social */}
          <div>
            <div className="mb-6">
              <img
                src={footerLogo}
                alt="Misti Services"
                width={260}
                height={48}
                className="h-12 w-auto object-contain"
                onError={() => {
                  const fallbacks = [logoOptimizedSrc, logoSrc];
                  const next = fallbacks[logoFallbackIdx];
                  if (next) {
                    setFooterLogo(next);
                    setLogoFallbackIdx((i) => i + 1);
                  }
                }}
              />
            </div>
            {socialLinks.length > 0 && (
              <div className="flex gap-4 mb-6">
                {socialLinks.map((social) => {
                  const icon = renderIcon(social.icon_name, social.platform, social.url);
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 
                                 border border-white/10 flex items-center justify-center 
                                 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]
                                 hover:scale-110 transition-all duration-300 text-white"
                      title={social.platform}
                    >
                      {icon || <span className="text-xs text-white">{social.platform.charAt(0)}</span>}
                    </a>
                  );
                })}
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Merchant Name:</p>
              <p>Masterloot Solutions LLC</p>
              <p>30 North Gould Street</p>
              <p>Sheridan, WY 82801</p>
              <p>United States</p>
            </div>
          </div>

          {/* Dynamic Footer Sections */}
          {sections.map((section) => (
            <div key={section.id}>
              <h4 className="font-semibold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{section.title}</h4>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.id}>
                    {link.url.startsWith("/") ? (
                      <Link to={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.url}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        target={link.url.startsWith("http") ? "_blank" : undefined}
                        rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/cashback" className="text-muted-foreground hover:text-primary transition-colors">
                  Cashback Rewards
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-muted-foreground hover:text-primary transition-colors">
                  Sitemap
                </Link>
              </li>
              <li>
                <button
                  onClick={openPreferences}
                  className="text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  Manage Cookies
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="py-6 border-t border-border/50 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            misti.services is not endorsed by, directly affiliated with, maintained, or sponsored by any game publisher
            or developer. All game names, logos, and related materials are trademarks and copyrights of their respective
            owners. The views and opinions expressed by misti.services do not reflect those of anyone officially
            associated with producing or managing game franchises.
          </p>
        </div>

        {/* Copyright and Security Badges */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border/50 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <div className="flex flex-col items-center md:items-start gap-3">
            <p className="text-xs text-muted-foreground">© misti.services 2013-{currentYear}. All rights reserved.</p>
            {/* Badges Row - Stripe Climate + Trustpilot side by side */}
            <div className="flex flex-wrap items-center gap-4">
              <div ref={stripeRef} style={{ minHeight: 38, minWidth: 380 }}>
                {showStripeIframe && (
                  <iframe
                    width="380"
                    height="38"
                    style={{ border: 0,background: "transparent",borderRadius:'9px' }}
                    src="https://climate.stripe.com/badge/rcvWYp?theme=dark&size=small&locale=en-US"
                    title="Stripe Climate Badge"
                    loading="lazy"
                  />
                )}
              </div>
              {/* Trustpilot badge with fixed sizing to avoid scaling issues */}
              <a 
                href="https://www.trustpilot.com/review/misti.services" 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-9 px-3 rounded-md border border-white/15 bg-white/5
                           text-sm text-muted-foreground hover:text-primary
                           hover:border-primary/40 transition-colors whitespace-nowrap
                           inline-flex items-center gap-2 shrink-0"
              >
                <span className="text-green-400 leading-none">★★★★★</span>
                <span>Trustpilot</span>
              </a>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg 
                            bg-gradient-to-r from-green-500/10 to-emerald-500/10 
                            border border-green-500/30 text-green-400
                            hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all duration-300">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">SECURE</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg 
                            bg-gradient-to-r from-blue-500/10 to-cyan-500/10 
                            border border-blue-500/30 text-blue-400
                            hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300">
              <BadgeCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">PCI DSS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
