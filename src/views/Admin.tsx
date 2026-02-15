import { useEffect, useState, lazy, Suspense, useRef, Component, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/LazyFooter";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Loader2, Gamepad2, FolderTree, Package, Users, ShoppingCart, DollarSign, Tag, Layout, FileText, CreditCard, Workflow, Sliders, Star, Coins, Gift, Headphones, MessageSquare, Shield, Globe, Cookie, TrendingUp, Images, Briefcase, Mail, Award, Sparkles, Search, RefreshCw, HelpCircle, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { useMFAStatus } from "@/hooks/useMFAStatus";
import { MFARequiredPrompt } from "@/components/auth/MFARequiredPrompt";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { clearAllAPICache, invalidateAdminQueries } from "@/lib/adminSupabase";
import { env } from "@/lib/env";

// Lazy load all admin components for optimal performance
const GamesManager = lazy(() => import("@/components/admin/GamesManager"));
const CategoriesManager = lazy(() => import("@/components/admin/CategoriesManager"));
const ProductsManager = lazy(() => import("@/components/admin/ProductsManager"));
const UsersManager = lazy(() => import("@/components/admin/UsersManager"));
const OrdersManager = lazy(() => import("@/components/admin/OrdersManager"));
const PriceManager = lazy(() => import("@/components/admin/PriceManager"));
const GenresManager = lazy(() => import("@/components/admin/GenresManager"));
const FooterManager = lazy(() => import("@/components/admin/FooterManager"));
const BlogManager = lazy(() => import("@/components/admin/BlogManager"));
const BlogCategoriesManager = lazy(() => import("@/components/admin/BlogCategoriesManager"));
const PaymentMethodsManager = lazy(() => import("@/components/admin/PaymentMethodsManager"));
const HowItWorksManager = lazy(() => import("@/components/admin/HowItWorksManager"));
const SliderProductsManager = lazy(() => import("@/components/admin/SliderProductsManager"));
const SingleEndpointSliderManager = lazy(() => import("@/components/admin/SingleEndpointSliderManager"));
const BulkProductOptionsManager = lazy(() => import("@/components/admin/BulkProductOptionsManager"));
const WhyWeManager = lazy(() => import("@/components/admin/WhyWeManager"));
const CurrencyManager = lazy(() => import("@/components/admin/CurrencyManager"));
const CashbackTiersManager = lazy(() => import("@/components/admin/CashbackTiersManager").then(m => ({ default: m.CashbackTiersManager })));
const ContactInfoManager = lazy(() => import("@/components/admin/ContactInfoManager").then(m => ({ default: m.ContactInfoManager })));
const ProductInquiriesManager = lazy(() => import("@/components/admin/ProductInquiriesManager").then(m => ({ default: m.ProductInquiriesManager })));
const PaymentIconsManager = lazy(() => import("@/components/admin/PaymentIconsManager").then(m => ({ default: m.PaymentIconsManager })));
const ProductGuaranteesManager = lazy(() => import("@/components/admin/ProductGuaranteesManager").then(m => ({ default: m.ProductGuaranteesManager })));
const ProductTrustBadgesManager = lazy(() => import("@/components/admin/ProductTrustBadgesManager"));
const WorkApplicationsManager = lazy(() => import("@/components/admin/WorkApplicationsManager"));
const ChatIntegrationManager = lazy(() => import("@/components/admin/ChatIntegrationManager"));
const ReviewsManager = lazy(() => import("@/components/admin/ReviewsManager"));
const ReviewPlatformsManager = lazy(() => import("@/components/admin/ReviewPlatformsManager"));
const CMSPagesManager = lazy(() => import("@/components/admin/CMSPagesManager").then(m => ({ default: m.CMSPagesManager })));
const CookieCategoriesManager = lazy(() => import("@/components/admin/CookieCategoriesManager"));
const CookieBannerManager = lazy(() => import("@/components/admin/CookieBannerManager"));
const CookieConsentLogsManager = lazy(() => import("@/components/admin/CookieConsentLogsManager"));
const AboutStatsManager = lazy(() => import("@/components/admin/AboutStatsManager").then(m => ({ default: m.AboutStatsManager })));
const DiscordConfigManager = lazy(() => import("@/components/admin/DiscordConfigManager").then(m => ({ default: m.DiscordConfigManager })));
const GlobalReviewManager = lazy(() => import("@/components/admin/GlobalReviewManager"));
const ServiceHighlightsManager = lazy(() => import("@/components/admin/ServiceHighlightsManager"));
const CouponsManager = lazy(() => import("@/components/admin/CouponsManager").then(m => ({ default: m.CouponsManager })));
const BulkImageUploader = lazy(() => import("@/components/admin/BulkImageUploader").then(m => ({ default: m.BulkImageUploader })));
const ImageConverterTool = lazy(() => import("@/components/admin/ImageConverterTool").then(m => ({ default: m.ImageConverterTool })));
const DeletedUrlsManager = lazy(() => import("@/components/admin/DeletedUrlsManager"));
const FAQManager = lazy(() => import("@/components/admin/FAQManager").then(m => ({ default: m.FAQManager })));
const GameFAQsManager = lazy(() => import("@/components/admin/GameFAQsManager"));
const EmailTestManager = lazy(() => import("@/components/admin/EmailTestManager"));
const ReferralManager = lazy(() => import("@/components/admin/ReferralManager"));
const RewardsManager = lazy(() => import("@/components/admin/RewardsManager"));
const G2GPriceSyncManager = lazy(() => import("@/components/admin/G2GPriceSyncManager"));
const SiteFAQsManager = lazy(() => import("@/components/admin/SiteFAQsManager"));
const RedirectsManager = lazy(() => import("@/components/admin/RedirectsManager"));
const MFASettingsManager = lazy(() => import("@/components/admin/MFASettingsManager").then(m => ({ default: m.MFASettingsManager })));
const SecurityAuditLogsManager = lazy(() => import("@/components/admin/SecurityAuditLogsManager"));


// Error Boundary for lazy-loaded components
class ErrorBoundary extends Component<
  { children: ReactNode; sectionName?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; sectionName?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Admin section error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="text-destructive text-lg font-semibold">
            Failed to load {this.props.sectionName || 'this section'}
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const adminSections = [
  // Catalog Management
  { id: "games", title: "Games", icon: Gamepad2, category: "Catalog Management" },
  { id: "genres", title: "Game Genres", icon: Tag, category: "Catalog Management" },
  { id: "categories", title: "Categories", icon: FolderTree, category: "Catalog Management" },
  { id: "products", title: "Products", icon: Package, category: "Catalog Management" },
  { id: "bulk-product-options", title: "Bulk Product Options", icon: Package, category: "Catalog Management" },
  { id: "sliders", title: "Range Slider Products", icon: Sliders, category: "Catalog Management" },
  { id: "single-sliders", title: "Single Slider Products", icon: Sliders, category: "Catalog Management" },
  { id: "prices", title: "Price Management", icon: DollarSign, category: "Catalog Management" },
  { id: "g2g-sync", title: "Price Sync", icon: RefreshCw, category: "Catalog Management" },
  
  // AI-Powered Tools
  { id: "game-faqs", title: "Game FAQs (AI)", icon: Sparkles, category: "AI-Powered Tools" },
  { id: "faqs", title: "Product FAQs (AI)", icon: Sparkles, category: "AI-Powered Tools" },
  { id: "rewards", title: "Product Rewards (AI)", icon: Sparkles, category: "AI-Powered Tools" },
  
  // Media & Assets
  { id: "bulk-images", title: "Bulk Image Upload", icon: Images, category: "Media & Assets" },
  { id: "image-converter", title: "Image Converter", icon: Images, category: "Media & Assets" },
  
  // Orders & Customers
  { id: "orders", title: "Orders", icon: ShoppingCart, category: "Orders & Customers", hasNotification: true },
  { id: "inquiries", title: "Product Inquiries", icon: Headphones, category: "Orders & Customers", hasNotification: true },
  { id: "users", title: "Users", icon: Users, category: "Orders & Customers" },
  
  // Discounts & Promotions
  { id: "cashback", title: "Cashback Tiers", icon: Gift, category: "Discounts & Promotions" },
  { id: "referrals", title: "Referral Program", icon: Users, category: "Discounts & Promotions" },
  { id: "coupons", title: "Coupons", icon: Tag, category: "Discounts & Promotions" },
  
  // Recruitment
  { id: "work-applications", title: "Work Applications", icon: Briefcase, category: "Recruitment", hasNotification: true },
  
  // Payment & Currency
  { id: "payments", title: "Payment Methods", icon: CreditCard, category: "Payment & Currency" },
  { id: "payment-icons", title: "Payment Icons", icon: CreditCard, category: "Payment & Currency" },
  { id: "currency", title: "Currency Rates", icon: Coins, category: "Payment & Currency" },
  
  // Reviews & Trust
  { id: "global-reviews", title: "Global Review Config", icon: Star, category: "Reviews & Trust" },
  { id: "reviews", title: "Customer Reviews", icon: Star, category: "Reviews & Trust" },
  { id: "review-platforms", title: "Review Platforms", icon: Globe, category: "Reviews & Trust" },
  { id: "guarantees", title: "Product Guarantees", icon: Shield, category: "Reviews & Trust" },
  { id: "trust-badges", title: "Product Trust Badges", icon: Shield, category: "Reviews & Trust" },
  
  // Content Management
  { id: "blog-categories", title: "Blog Categories", icon: Tag, category: "Content Management" },
  { id: "blog", title: "Blog & Legal Pages", icon: FileText, category: "Content Management" },
  { id: "cms-pages", title: "CMS Pages", icon: FileText, category: "Content Management" },
  { id: "howitworks", title: "How It Works", icon: Workflow, category: "Content Management" },
  { id: "whywe", title: "Why We", icon: Shield, category: "Content Management" },
  { id: "service-highlights", title: "Service Highlights", icon: Star, category: "Content Management" },
  { id: "about-stats", title: "About Us Stats", icon: TrendingUp, category: "Content Management" },
  { id: "site-faqs", title: "Site FAQs", icon: HelpCircle, category: "Content Management" },
  
  // Communication
  { id: "chat-integration", title: "Chat Integration", icon: MessageSquare, category: "Communication" },
  { id: "discord-config", title: "Discord Settings", icon: MessageSquare, category: "Communication" },
  { id: "contact-info", title: "Contact Information", icon: Headphones, category: "Communication" },
  { id: "email-test", title: "Email Testing", icon: Mail, category: "Communication" },
  
  // Site Settings
  { id: "footer", title: "Footer Management", icon: Layout, category: "Site Settings" },
  { id: "cookie-categories", title: "Cookie Categories", icon: Cookie, category: "Site Settings" },
  { id: "cookie-banner", title: "Cookie Banner", icon: Cookie, category: "Site Settings" },
  { id: "cookie-logs", title: "Consent Logs", icon: Shield, category: "Site Settings" },
  { id: "deleted-urls", title: "Deleted URLs (410)", icon: FileText, category: "Site Settings" },
  { id: "redirects", title: "301 Redirects", icon: ArrowRightLeft, category: "Site Settings" },
  
  // Security
  { id: "mfa-settings", title: "2FA Settings", icon: ShieldCheck, category: "Security" },
  { id: "security-logs", title: "Security Logs", icon: Shield, category: "Security" },
];

// Group sections by category
const groupedSections = adminSections.reduce((acc, section) => {
  if (!acc[section.category]) {
    acc[section.category] = [];
  }
  acc[section.category].push(section);
  return acc;
}, {} as Record<string, typeof adminSections>);

function AdminSidebar({ 
  activeSection, 
  onSectionChange,
  notificationCounts 
}: { 
  activeSection: string; 
  onSectionChange: (section: string) => void;
  notificationCounts: { orders: number; workApplications: number; inquiries: number; };
}) {
  const { open } = useSidebar();

  const getNotificationCount = (sectionId: string) => {
    switch (sectionId) {
      case "orders":
        return notificationCounts.orders;
      case "work-applications":
        return notificationCounts.workApplications;
      case "inquiries":
        return notificationCounts.inquiries;
      default:
        return 0;
    }
  };

  return (
    <Sidebar className="border-r [&>[data-sidebar=sidebar]]:top-20 [&>[data-sidebar=sidebar]]:h-[calc(100vh-5rem)] [&>div:first-child]:h-[calc(100vh-5rem)]">
      <SidebarContent className="pt-4 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-3 mb-2">
            Admin Panel
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* Render grouped sections */}
        {Object.entries(groupedSections).map(([category, sections]) => (
          <SidebarGroup key={category}>
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              {category}
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-1">
              <SidebarMenu>
                {sections.map((section) => (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(section.id)}
                      className={`w-full justify-start gap-3 px-4 py-3 transition-colors ${
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-accent"
                      }`}
                    >
                      <section.icon className="h-5 w-5" />
                      {open && (
                        <>
                          <span className="flex-1">{section.title}</span>
                          <NotificationBadge count={getNotificationCount(section.id)} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState("games");
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add MFA status check
  const { isEnrolled: isMFAEnrolled, isRequired: isMFARequired, isLoading: mfaLoading } = useMFAStatus();
  
  // Add notifications hook
  const { counts: notificationCounts, connectionState } = useAdminNotifications();

  // Performance monitoring (development only)
  useEffect(() => {
    if (env.DEV) {
      console.log(`[Admin] Active section: ${activeSection}`);
      console.log(`[Admin] Notification counts:`, notificationCounts);
      console.log(`[Admin] Connection state: ${connectionState}`);
    }
  }, [activeSection, notificationCounts, connectionState]);

  useEffect(() => {
    const checkAdmin = async () => {
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
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  // Clear all caches on admin mount to ensure fresh data
  useEffect(() => {
    if (isAdmin) {
      // Clear API caches and React Query cache to ensure admin always starts fresh
      Promise.all([
        clearAllAPICache(),
        invalidateAdminQueries()
      ]).then(() => {
        console.log('[Admin] Cleared all caches on mount');
      });
    }
  }, [isAdmin]);

  // Prefetch commonly used sections after initial load with cleanup
  useEffect(() => {
    if (isAdmin) {
      prefetchTimerRef.current = setTimeout(() => {
        import("@/components/admin/ProductsManager");
        import("@/components/admin/OrdersManager");
        import("@/components/admin/GamesManager");
      }, 2000);
    }

    return () => {
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current);
      }
    };
  }, [isAdmin]);

  if (loading || mfaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Check if admin needs to set up MFA
  if (isMFARequired && !isMFAEnrolled) {
    return <MFARequiredPrompt />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "games":
        return <GamesManager />;
      case "genres":
        return <GenresManager />;
      case "game-faqs":
        return <GameFAQsManager />;
      case "categories":
        return <CategoriesManager />;
      case "products":
        return <ProductsManager />;
      case "faqs":
        return <FAQManager />;
      case "rewards":
        return <RewardsManager />;
      case "bulk-product-options":
        return <BulkProductOptionsManager />;
      case "bulk-images":
        return <BulkImageUploader />;
      case "image-converter":
        return <ImageConverterTool />;
      case "sliders":
        return <SliderProductsManager />;
      case "single-sliders":
        return <SingleEndpointSliderManager />;
      case "prices":
        return <PriceManager />;
      case "g2g-sync":
        return <G2GPriceSyncManager />;
      case "orders":
        return <OrdersManager />;
      case "payments":
        return <PaymentMethodsManager />;
      case "currency":
        return <CurrencyManager />;
      case "cashback":
        return <CashbackTiersManager />;
      case "coupons":
        return <CouponsManager />;
      case "referrals":
        return <ReferralManager />;
      case "users":
        return <UsersManager />;
      case "blog":
        return <BlogManager />;
      case "blog-categories":
        return <BlogCategoriesManager />;
      case "cms-pages":
        return <CMSPagesManager />;
      case "about-stats":
        return <AboutStatsManager />;
      case "footer":
        return <FooterManager />;
      case "howitworks":
        return <HowItWorksManager />;
      case "whywe":
        return <WhyWeManager />;
      case "service-highlights":
        return <ServiceHighlightsManager />;
      case "global-reviews":
        return <GlobalReviewManager />;
      case "contact-info":
        return <ContactInfoManager />;
      case "inquiries":
        return <ProductInquiriesManager />;
      case "payment-icons":
        return <PaymentIconsManager />;
      case "guarantees":
        return <ProductGuaranteesManager />;
      case "trust-badges":
        return <ProductTrustBadgesManager />;
      case "work-applications":
        return <WorkApplicationsManager />;
      case "chat-integration":
        return <ChatIntegrationManager />;
      case "discord-config":
        return <DiscordConfigManager />;
      case "reviews":
        return <ReviewsManager />;
      case "review-platforms":
        return <ReviewPlatformsManager />;
      case "cookie-categories":
        return <CookieCategoriesManager />;
      case "cookie-banner":
        return <CookieBannerManager />;
      case "cookie-logs":
        return <CookieConsentLogsManager />;
      case "email-test":
        return <EmailTestManager />;
      case "deleted-urls":
        return <DeletedUrlsManager />;
      case "site-faqs":
        return <SiteFAQsManager />;
      case "redirects":
        return <RedirectsManager />;
      case "mfa-settings":
        return <MFASettingsManager />;
      case "security-logs":
        return <SecurityAuditLogsManager />;
      default:
        return <GamesManager />;
    }
  };

  const currentSection = adminSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mt-20">
        <SidebarProvider defaultOpen={true}>
          <div className="flex w-full min-h-[calc(100vh-5rem)]">
            <AdminSidebar 
              activeSection={activeSection} 
              onSectionChange={setActiveSection}
              notificationCounts={notificationCounts}
            />
            
            <main className="flex-1 overflow-auto">
              <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container flex h-16 items-center px-8">
                  <SidebarTrigger className="mr-4" />
                  <div className="flex items-center gap-3">
                    {currentSection && <currentSection.icon className="h-6 w-6 text-primary" />}
                    <h1 className="text-2xl font-bold">{currentSection?.title}</h1>
                  </div>
                </div>
              </div>
              
              <div className="container px-8 py-8 animate-fade-in">
                <ErrorBoundary sectionName={currentSection?.title}>
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Loading {currentSection?.title}...
                        </p>
                      </div>
                    }
                  >
                    {renderContent()}
                  </Suspense>
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;