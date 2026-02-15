"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RouteKey } from "@/lib/nextRoutes";
import { RouterRuntimeProvider } from "@/lib/react-router-dom-shim";
import { isPrerender, signalPrerenderReady } from "@/lib/prerender";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ThirdPartyChatWidget from "@/components/ThirdPartyChatWidget";
import ClientRedirectHandler from "@/components/ClientRedirectHandler";
import ScrollToTop from "@/components/ScrollToTop";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

const Index = dynamic(() => import("@/views/Index"), { ssr: false });
const Services = dynamic(() => import("@/views/Services"), { ssr: false });
const ProductDetail = dynamic(() => import("@/views/ProductDetail"), { ssr: false });
const Checkout = dynamic(() => import("@/views/Checkout"), { ssr: false });
const PaymentSuccess = dynamic(() => import("@/views/PaymentSuccess"), { ssr: false });
const Order = dynamic(() => import("@/views/Order"), { ssr: false });
const Orders = dynamic(() => import("@/views/Orders"), { ssr: false });
const Auth = dynamic(() => import("@/views/Auth"), { ssr: false });
const Account = dynamic(() => import("@/views/Account"), { ssr: false });
const Admin = dynamic(() => import("@/views/Admin"), { ssr: false });
const Blog = dynamic(() => import("@/views/Blog"), { ssr: false });
const BlogPost = dynamic(() => import("@/views/BlogPost"), { ssr: false });
const SitemapGenerator = dynamic(() => import("@/views/SitemapGenerator"), { ssr: false });
const Sitemap = dynamic(() => import("@/views/Sitemap"), { ssr: false });
const WorkWithUs = dynamic(() => import("@/views/WorkWithUs"), { ssr: false });
const AboutUs = dynamic(() => import("@/views/AboutUs"), { ssr: false });
const ContactUs = dynamic(() => import("@/views/ContactUs"), { ssr: false });
const Cashback = dynamic(() => import("@/views/Cashback"), { ssr: false });
const ResetPassword = dynamic(() => import("@/views/ResetPassword"), { ssr: false });
const Gone = dynamic(() => import("@/views/Gone"), { ssr: false });
const Forbidden = dynamic(() => import("@/views/Forbidden"), { ssr: false });
const NotFound = dynamic(() => import("@/views/NotFound"), { ssr: false });

const CookieBanner = lazy(() => import("@/components/CookieBanner"));
const CookiePreferencesModal = lazy(() => import("@/components/CookiePreferencesModal"));

function CookieModals() {
  const { isPreferencesOpen } = useCookieConsent();
  const [showBanner, setShowBanner] = useState(false);

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
      {isPreferencesOpen && (
        <Suspense fallback={null}>
          <CookiePreferencesModal />
        </Suspense>
      )}
    </>
  );
}

function renderRoute(routeKey: RouteKey) {
  switch (routeKey) {
    case "index":
      return <Index />;
    case "services":
      return <Services />;
    case "productDetail":
      return <ProductDetail />;
    case "checkout":
      return <Checkout />;
    case "paymentSuccess":
      return <PaymentSuccess />;
    case "order":
      return <Order />;
    case "orders":
      return <Orders />;
    case "auth":
      return <Auth />;
    case "account":
      return <Account />;
    case "admin":
      return <Admin />;
    case "blog":
      return <Blog />;
    case "blogPost":
      return <BlogPost />;
    case "sitemap":
      return <Sitemap />;
    case "sitemapGenerator":
      return <SitemapGenerator />;
    case "workWithUs":
      return <WorkWithUs />;
    case "aboutUs":
      return <AboutUs />;
    case "contactUs":
      return <ContactUs />;
    case "cashback":
      return <Cashback />;
    case "resetPassword":
      return <ResetPassword />;
    case "gone":
      return <Gone />;
    case "forbidden":
      return <Forbidden />;
    case "notFound":
      return <NotFound />;
    default:
      return <NotFound />;
  }
}

export default function AppShellClient({
  routeKey,
  routeParams,
}: {
  routeKey: RouteKey;
  routeParams: Record<string, string>;
}) {
  usePageTracking();

  useEffect(() => {
    const prerenderMode = isPrerender() || (window as any).IS_PRERENDERING;
    if (!prerenderMode) return;
    const timer = setTimeout(() => signalPrerenderReady({ timeout: 15000 }), 2000);
    return () => clearTimeout(timer);
  }, [routeKey]);

  return (
    <RouterRuntimeProvider params={routeParams}>
      <ClientRedirectHandler />
      <Toaster />
      <Sonner />
      <ThirdPartyChatWidget />
      <CookieModals />
      <ScrollToTop />
      {renderRoute(routeKey)}
    </RouterRuntimeProvider>
  );
}
