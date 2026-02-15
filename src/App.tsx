import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { CartProvider } from "./contexts/CartContext";
import { CookieConsentProvider, useCookieConsent } from "./contexts/CookieConsentContext";
import { usePageTracking } from "./hooks/usePageTracking";
import ThirdPartyChatWidget from "./components/ThirdPartyChatWidget";
import { isPrerender, signalPrerenderReady } from "./lib/prerender";
import ClientRedirectHandler from "./components/ClientRedirectHandler";
import ScrollToTop from "./components/ScrollToTop";


// Lazy load non-critical UI components to reduce initial bundle
const CookieBanner = lazy(() => import("./components/CookieBanner"));
// CookiePreferencesModal is only loaded when user opens preferences
const CookiePreferencesModal = lazy(() => import("./components/CookiePreferencesModal"));

// Lazy load pages to reduce initial bundle size and improve FID
const Index = lazy(() => import("./views/Index"));
const Services = lazy(() => import("./views/Services"));
const ProductDetail = lazy(() => import("./views/ProductDetail"));
const Checkout = lazy(() => import("./views/Checkout"));
const PaymentSuccess = lazy(() => import("./views/PaymentSuccess"));
const Order = lazy(() => import("./views/Order"));
const Orders = lazy(() => import("./views/Orders"));
const NotFound = lazy(() => import("./views/NotFound"));
const Gone = lazy(() => import("./views/Gone"));
const Forbidden = lazy(() => import("./views/Forbidden"));
const Auth = lazy(() => import("./views/Auth"));
const Account = lazy(() => import("./views/Account"));
const Admin = lazy(() => import("./views/Admin"));
const Blog = lazy(() => import("./views/Blog"));
const BlogPost = lazy(() => import("./views/BlogPost"));
const SitemapGenerator = lazy(() => import("./views/SitemapGenerator"));
const Sitemap = lazy(() => import("./views/Sitemap"));
const WorkWithUs = lazy(() => import("./views/WorkWithUs"));
const AboutUs = lazy(() => import("./views/AboutUs"));
const ContactUs = lazy(() => import("./views/ContactUs"));
const Cashback = lazy(() => import("./views/Cashback"));
const ResetPassword = lazy(() => import("./views/ResetPassword"));

// Separate component to access cookie context with deferred loading for better LCP
const CookieModals = () => {
  const { isPreferencesOpen } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);
  
  // Defer cookie banner by 4 seconds to prioritize critical content rendering
  useEffect(() => {
    const timer = setTimeout(() => setShowBanner(true), 4000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      {showBanner && (
        <Suspense fallback={null}>
          <CookieBanner />
        </Suspense>
      )}
      {/* Only load CookiePreferencesModal when user opens preferences */}
      {isPreferencesOpen && (
        <Suspense fallback={null}>
          <CookiePreferencesModal />
        </Suspense>
      )}
    </>
  );
};

const AppContent = () => {
  usePageTracking();
  const location = useLocation();
  
  // Global fallback prerender signal - ensures ostr.io always gets a ready signal
  // even if individual pages don't call signalPrerenderReady
  useEffect(() => {
    // Early exit if not prerendering - avoids unnecessary timer setup on every navigation
    const isPrerenderMode = isPrerender() || (window as any).IS_PRERENDERING;
    if (!isPrerenderMode) return;
    
    // Give the page time to render, then signal ready as a fallback
    const timer = setTimeout(() => {
      signalPrerenderReady({ timeout: 15000 });
    }, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  return (
    <>
      <ClientRedirectHandler />
      <Toaster />
      <Sonner />
      <ThirdPartyChatWidget />
      <CookieModals />
      <ScrollToTop />
      
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/game/:gameSlug" element={<Services />} />
          <Route path="/game/:gameSlug/:categorySlug" element={<Services />} />
          <Route path="/game/:gameSlug/:categorySlug/:productSlug" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/order/:orderId" element={<Order />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/sitemap-generator" element={<SitemapGenerator />} />
          <Route path="/work-with-us" element={<WorkWithUs />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/cashback" element={<Cashback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/gone" element={<Gone />} />
          <Route path="/forbidden" element={<Forbidden />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <TooltipProvider>
    <CartProvider>
      <CookieConsentProvider>
        <AppContent />
      </CookieConsentProvider>
    </CartProvider>
  </TooltipProvider>
);

export default App;
