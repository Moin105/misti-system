"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { setQueryClient } from "@/lib/adminSupabase";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 10 * 60 * 1000,
          gcTime: 30 * 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
    setQueryClient(client);
    return client;
  });

  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <CurrencyProvider>
            <TooltipProvider>
              <CartProvider>
                <CookieConsentProvider>
                  <ServiceWorkerRegistrar />
                  {children}
                </CookieConsentProvider>
              </CartProvider>
            </TooltipProvider>
          </CurrencyProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
