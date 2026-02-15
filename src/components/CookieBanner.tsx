import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { motion, AnimatePresence } from "framer-motion";
import { isPrerender } from "@/lib/prerender";
import { useCookieBannerConfig } from "@/hooks/useInitialPageData";

interface CookieBannerProps {
  previewMode?: boolean;
}

export default function CookieBanner({ previewMode = false }: CookieBannerProps) {
  const { hasConsent, acceptAll, rejectAll, openPreferences } = useCookieConsent();

  // Use consolidated initial page data hook instead of separate query
  const { config } = useCookieBannerConfig();

  // Don't show if user has already consented (unless preview mode)
  // Also hide for prerender bots so content isn't obscured in cached pages
  if (!previewMode && (hasConsent || !config || isPrerender())) return null;

  const isBottom = config?.banner_position === "bottom" || previewMode;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: isBottom ? 100 : -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: isBottom ? 100 : -100, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed ${
          isBottom ? "bottom-0" : "top-0"
        } left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t ${
          isBottom ? "border-t" : "border-b"
        } shadow-xl`}
      >
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex items-start gap-3 flex-1">
              <div className="rounded-full bg-primary/10 p-3 flex-shrink-0">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold">
                  {config?.heading || "We value your privacy"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {config?.description ||
                    "We use cookies to enhance your browsing experience and analyze our traffic. Please choose your preferences."}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="ghost"
                onClick={previewMode ? undefined : rejectAll}
                className="w-full sm:w-auto"
              >
                {config?.reject_button_text || "Reject All"}
              </Button>
              <Button
                variant="outline"
                onClick={previewMode ? undefined : openPreferences}
                className="w-full sm:w-auto"
              >
                {config?.customize_button_text || "Customize"}
              </Button>
              <Button
                variant="solid"
                onClick={previewMode ? undefined : acceptAll}
                className="w-full sm:w-auto"
              >
                {config?.accept_button_text || "Accept All"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
