import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Lock, ShieldCheck, BadgeCheck } from "lucide-react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { useDeferredFooterData } from "@/hooks/useDeferredFooterData";
import mistiLogoSrc from "@/assets/misti-logo.png";

// Ensure logo is a string URL
const mistiLogo = typeof mistiLogoSrc === 'string' ? mistiLogoSrc : (mistiLogoSrc as any)?.default || (mistiLogoSrc as any)?.src || String(mistiLogoSrc);
import { DynamicIcon } from "@/components/DynamicIcon";

// Trustpilot global type declaration
declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement: (element: HTMLElement | null) => void;
    };
  }
}

const Footer = () => {
  const { openPreferences } = useCookieConsent();
  const [showStripeIframe, setShowStripeIframe] = useState(false);
  const [showTrustpilot, setShowTrustpilot] = useState(false);

  const stripeRef = useRef<HTMLDivElement>(null);
  const trustpilotContainerRef = useRef<HTMLDivElement>(null);
  const trustpilotWidgetRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

  // Deferred footer data - only fetches when footer is near viewport
  const { footerData, observerRef } = useDeferredFooterData();

  const sections = footerData?.sections || [];
  const socialLinks = footerData?.socialLinks || [];

  // Lazy load Stripe iframe and Trustpilot widget when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          if (entry.target === stripeRef.current) {
            setShowStripeIframe(true);
          }

          if (entry.target === trustpilotContainerRef.current) {
            setShowTrustpilot(true);
          }
        });
      },
      { rootMargin: "100px" },
    );

    if (stripeRef.current) observer.observe(stripeRef.current);
    if (trustpilotContainerRef.current) observer.observe(trustpilotContainerRef.current);

    return () => observer.disconnect();
  }, []);

  // Load Trustpilot script when widget becomes visible
  useEffect(() => {
    if (!showTrustpilot) return;

    const TRUSTPILOT_SCRIPT_ID = "trustpilot-bootstrap";
    const TRUSTPILOT_SCRIPT_SRC = "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";

    const tryInitialize = (attempt = 0) => {
      const el = trustpilotWidgetRef.current;
      if (window.Trustpilot && el) {
        window.Trustpilot.loadFromElement(el);
        return;
      }

      // Script/global may take a moment to attach; retry a few times.
      if (attempt < 20) {
        window.setTimeout(() => tryInitialize(attempt + 1), 250);
      }
    };

    const existingScript = document.getElementById(TRUSTPILOT_SCRIPT_ID) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = TRUSTPILOT_SCRIPT_ID;
      script.src = TRUSTPILOT_SCRIPT_SRC;
      script.async = true;
      script.onload = () => tryInitialize();
      script.onerror = () => {
        // If blocked by an extension, the fallback anchor text will remain.
        console.warn("Trustpilot script failed to load (possibly blocked by an extension).");
      };
      document.body.appendChild(script);

      // Also attempt init after render (covers fast-load cases).
      tryInitialize();
      return;
    }

    // Script already loaded (or loading)
    tryInitialize();
  }, [showTrustpilot]);

  const renderIcon = (iconName: string) => {
    return <DynamicIcon name={iconName} className="w-5 h-5" />;
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
                src={mistiLogo}
                alt="Misti Services"
                width={260}
                height={48}
                className="h-12 w-auto object-contain"
              />
            </div>
            {socialLinks.length > 0 && (
              <div className="flex gap-4 mb-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 
                               border border-white/10 flex items-center justify-center 
                               hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]
                               hover:scale-110 transition-all duration-300"
                  >
                    {renderIcon(social.icon_name)}
                  </a>
                ))}
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
                    style={{ border: 0 }}
                    src="https://climate.stripe.com/badge/rcvWYp?theme=dark&size=small&locale=en-US"
                    title="Stripe Climate Badge"
                    loading="lazy"
                  />
                )}
              </div>
              {/* Trustpilot Widget - Lazy Loaded */}
              <div ref={trustpilotContainerRef} style={{ minHeight: 24, minWidth: 180 }}>
                {showTrustpilot && (
                  <div
                    ref={trustpilotWidgetRef}
                    className="trustpilot-widget"
                    data-locale="en-US"
                    data-template-id="5419b6a8b0d04a076446a9ad"
                    data-businessunit-id="5b2e44d9a2dbb800012c86a0"
                    data-style-height="24px"
                    data-style-width="180px"
                    data-token="252f7748-aaac-4e1d-ad0f-a164100e2d5d"
                    data-min-review-count="0"
                    data-style-alignment="center"
                  >
                    <a href="https://www.trustpilot.com/review/misti.services" target="_blank" rel="noopener noreferrer">
                      Trustpilot
                    </a>
                  </div>
                )}
              </div>
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
