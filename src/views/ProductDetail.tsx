import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { isPrerender, signalPrerenderReady } from "@/lib/prerender";
import SEO from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/LazyFooter";
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeParsePrice } from "@/lib/priceUtils";
import {
  Check,
  Shield,
  Headphones,
  RefreshCw,
  Gift,
  Star,
  Loader2,
  ShoppingCart,
  Clock,
  Package,
  ChevronDown,
  FileText,
  Settings,
  ListChecks,
  Award,
  Link2,
} from "lucide-react";
import { DynamicIcon, getIconByName } from "@/components/DynamicIcon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { CollapsibleCheckboxGroup } from "@/components/CollapsibleCheckboxGroup";
import { useCart } from "@/contexts/CartContext";
import { sanitizeHtml } from "@/lib/sanitize";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { PopularProducts } from "@/components/PopularProducts";
import { ProductSupportSection } from "@/components/ProductSupportSection";
import TrustBadges from "@/components/TrustBadges";
import { ProductFAQSection } from "@/components/ProductFAQSection";
import CategoryPills from "@/components/CategoryPills";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";
import { useProductCore } from "@/hooks/useProductCore";
import { useProductExtras } from "@/hooks/useProductExtras";
import { useGameWithCategories } from "@/hooks/useGameData";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedCoverUrl } from "@/lib/imageOptimization";
import { Skeleton } from "@/components/ui/skeleton";


// Code-split slider configurators - ~50KB savings on initial bundle
const SliderProductConfigurator = lazy(() => import("@/components/SliderProductConfigurator"));
const SingleEndpointSliderConfigurator = lazy(() => import("@/components/SingleEndpointSliderConfigurator"));

// Loading fallback for slider configurators
const SliderConfiguratorSkeleton = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-12 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 flex-1" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-12 w-32 ml-auto" />
  </div>
);

interface ProductOption {
  id: string;
  name: string;
  label: string;
  option_type: "select" | "checkbox" | "number" | "text" | "button_group";
  options: any;
  is_required: boolean;
  default_value: string | null;
  price_modifier: number;
  price_modifier_type: string;
  percentage_applies_to_cumulative: boolean;
  min_value: number | null;
  max_value: number | null;
}

// Lazy-loaded FAQ Section wrapper - uses pre-fetched FAQs from useProductDetail
const LazyFAQSection = ({ product, faqs }: { product: any; faqs: any[] }) => {
  const { ref, isVisible } = useLazyLoad({ rootMargin: "300px" });
  
  if (!product) return null;
  
  return (
    <div ref={ref}>
      {isVisible && (
        <ProductFAQSection
          productId={product.id}
          productName={product.name}
          faqs={faqs}
        />
      )}
    </div>
  );
};

// Lazy-loaded Popular Products wrapper
const LazyPopularProducts = ({ product, category }: { product: any; category: any }) => {
  const { ref, isVisible } = useLazyLoad({ rootMargin: "300px" });
  
  if (!product || !category) return null;
  
  return (
    <div ref={ref}>
      {isVisible && (
        <PopularProducts currentProductId={product.id} categoryId={category.id} />
      )}
    </div>
  );
};

const ProductDetail = () => {
  const { gameSlug, categorySlug, productSlug } = useParams<{
    gameSlug: string;
    categorySlug: string;
    productSlug: string;
  }>();
  
  // PHASE 1: Core product data (critical for LCP)
  const { data: coreData, isLoading: coreLoading } = useProductCore(gameSlug, categorySlug, productSlug);
  
  // PHASE 2: Categories sidebar (cached by game, shared across products)
  const { data: gameData } = useGameWithCategories(gameSlug);
  
  // PHASE 3: Product extras (deferred - loaded after core data)
  const productId = coreData?.product?.id;
  const { data: extrasData, isLoading: extrasLoading } = useProductExtras(productId, !!productId);
  
  // Combine loading states - use coreLoading as primary indicator
  const isLoading = coreLoading;
  
  // Extract data from hook results
  const game = coreData?.game ?? null;
  const category = coreData?.category ?? null;
  const categories = gameData?.categories ?? [];
  const product = coreData?.product ?? null;
  const productOptions = extrasData?.productOptions ?? [];
  const productRewards = extrasData?.productRewards ?? null;
  const trustBadges = extrasData?.trustBadges ?? [];
  const deletedPaths = coreData?.deletedPaths ?? new Set<string>();
  const globalReviewConfig = coreData?.globalReviewConfig ?? null;
  const productFaqs = extrasData?.productFaqs ?? [];
  
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [buttonGroupModifier, setButtonGroupModifier] = useState(0);
  const { addToCart } = useCart();
  const { formatPrice, currency } = useCurrency();
  const [addingToCart, setAddingToCart] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation to gone page for deleted URLs
  useEffect(() => {
    if (!isLoading && deletedPaths.size > 0) {
      const gamePath = `/game/${gameSlug}`;
      const categoryPath = `/game/${gameSlug}/${categorySlug}`;
      const productPath = `/game/${gameSlug}/${categorySlug}/${productSlug}`;
      
      if (!game && deletedPaths.has(gamePath)) {
        navigate("/gone", { replace: true });
      } else if (!category && deletedPaths.has(categoryPath)) {
        navigate("/gone", { replace: true });
      } else if (!product && deletedPaths.has(productPath)) {
        navigate("/gone", { replace: true });
      }
    }
  }, [isLoading, game, category, product, deletedPaths, gameSlug, categorySlug, productSlug, navigate]);

  // Set default options when productOptions change
  useEffect(() => {
    if (productOptions.length > 0) {
      const defaults: Record<string, any> = {};
      productOptions.forEach((option: any) => {
        if (option.default_value) {
          defaults[option.name] = option.default_value;
        } else if (option.option_type === "checkbox") {
          const opts = option.options as any;
          if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
            opts.forEach((opt: any) => {
              defaults[`${option.name}-${opt.label}`] = false;
            });
          } else {
            defaults[option.name] = false;
          }
        } else if (
          (option.option_type === "select" || option.option_type === "button_group") &&
          option.options &&
          Array.isArray(option.options) &&
          option.options.length > 0
        ) {
          const firstOpt = option.options[0] as any;
          defaults[option.name] = typeof firstOpt === "object" ? firstOpt.label : firstOpt;
        }
      });
      setSelectedOptions(defaults);
    }
  }, [productOptions]);

  // Signal prerender ready when data is loaded
  useEffect(() => {
    if (!isLoading && product && game && category) {
      // Delay to ensure React Helmet has updated <head> before signaling ready
      // Using 500ms for pages with FAQs, rewards, and complex options
      const timer = setTimeout(() => {
        signalPrerenderReady({ requireStructuredData: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, product, game, category]);

  // OPTIMIZED: Preload LCP image for faster paint
  useEffect(() => {
    if (product?.image_url) {
      // Check if preload link already exists
      const existingLink = document.querySelector(`link[rel="preload"][href="${product.image_url}"]`);
      if (existingLink) return;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = product.image_url;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      return () => {
        if (link.parentNode) {
          link.remove();
        }
      };
    }
  }, [product?.image_url]);

  // Update button group modifier when selected options change
  useEffect(() => {
    let modifier = 0;
    productOptions.forEach((option) => {
      if (option.option_type === "button_group" && selectedOptions[option.name]) {
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          const selectedOpt = opts.find((o: any) => o.label === selectedOptions[option.name]);
          if (selectedOpt && selectedOpt.priceType === "percentage" && safeParsePrice(selectedOpt.price) !== 0) {
            modifier += safeParsePrice(selectedOpt.price);
          }
        }
      }
    });
    setButtonGroupModifier(modifier);
  }, [selectedOptions, productOptions]);

  // Loading and data validation checks moved to return statement

  // Calculate total price including option modifiers
  const calculateTotalPrice = () => {
    let total = product.base_price;

    // First pass: Check if there's a button group with percentage modifier selected
    let buttonGroupPercentageModifier = buttonGroupModifier;

    // Second pass: Calculate prices for all options
    productOptions.forEach((option) => {
      if (option.option_type === "checkbox") {
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          // New format - multiple checkboxes with individual prices
          opts.forEach((opt: any) => {
            if (selectedOptions[`${option.name}-${opt.label}`] && safeParsePrice(opt.price) !== 0) {
              let optionPrice = 0;
              if (opt.priceType === "percentage") {
                // Apply percentage to running total (like button groups)
                optionPrice = (total * safeParsePrice(opt.price)) / 100;
              } else {
                optionPrice = safeParsePrice(opt.price);
              }
              // Apply button group percentage modifier
              if (buttonGroupPercentageModifier !== 0) {
                optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
              }
              total += optionPrice;
            }
          });
        } else if (selectedOptions[option.name]) {
          // Old format - single checkbox
          let optionPrice = 0;
          if (option.price_modifier_type === "percentage") {
            // Apply percentage to cumulative or base based on setting
            const baseAmount = option.percentage_applies_to_cumulative ? total : product.base_price;
            optionPrice = (baseAmount * option.price_modifier) / 100;
          } else {
            optionPrice = option.price_modifier;
          }
          // Apply button group percentage modifier
          if (buttonGroupPercentageModifier !== 0) {
            optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
          }
          total += optionPrice;
        }
      } else if (
        (option.option_type === "select" || option.option_type === "button_group") &&
        selectedOptions[option.name]
      ) {
        // Find the selected option and apply its price
        const opts = option.options as any;
        if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === "object") {
          const selectedOpt = opts.find((o: any) => o.label === selectedOptions[option.name]);
          if (selectedOpt && selectedOpt.price && safeParsePrice(selectedOpt.price) !== 0) {
            let optionPrice = 0;

            // Button group percentages apply to current total (base + slider + options so far)
            if (option.option_type === "button_group" && selectedOpt.priceType === "percentage") {
              optionPrice = (total * safeParsePrice(selectedOpt.price)) / 100;
            } else if (selectedOpt.priceType === "percentage") {
              // Apply percentage to running total (like button groups)
              optionPrice = (total * safeParsePrice(selectedOpt.price)) / 100;
            } else {
              optionPrice = safeParsePrice(selectedOpt.price);
            }
            // Only apply button group percentage modifier to non-button-group options
            if (option.option_type !== "button_group" && buttonGroupPercentageModifier !== 0) {
              optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
            }
            total += optionPrice;
          }
        }
      } else if (option.option_type === "text" || option.option_type === "number") {
        // Text and number fields with global price modifier
        if (option.price_modifier !== 0) {
          let optionPrice = 0;
          if (option.price_modifier_type === "percentage") {
            // Apply percentage to cumulative or base based on setting
            const baseAmount = option.percentage_applies_to_cumulative ? total : product.base_price;
            optionPrice = (baseAmount * option.price_modifier) / 100;
          } else {
            optionPrice = option.price_modifier;
          }
          // Apply button group percentage modifier
          if (buttonGroupPercentageModifier !== 0) {
            optionPrice = optionPrice * (1 + buttonGroupPercentageModifier / 100);
          }
          total += optionPrice;
        }
      }
    });

    return total.toFixed(2);
  };

  // Memoize expensive price calculation
  const totalPrice = useMemo(() => {
    if (!product) return "0.00";
    return calculateTotalPrice();
  }, [product, selectedOptions, buttonGroupModifier, productOptions]);

  // Helper to get active button group percentage modifier (from state for UI reactivity)
  const getButtonGroupPercentageModifier = () => {
    return buttonGroupModifier;
  };

  // Helper to calculate display price with button group modifier
  const getDisplayPrice = (basePrice: number, isButtonGroup: boolean = false) => {
    if (isButtonGroup) return basePrice; // Don't modify button group prices
    const modifier = getButtonGroupPercentageModifier();
    if (modifier === 0) return basePrice;
    return basePrice * (1 + modifier / 100);
  };

  const handleOptionChange = (optionName: string, value: any) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const renderOptionInput = (option: ProductOption) => {
    switch (option.option_type) {
      case "select":
        const selectOptions = (option.options as any) || [];
        const isNewFormat =
          Array.isArray(selectOptions) && selectOptions.length > 0 && typeof selectOptions[0] === "object";
        return (
          <Select
            value={selectedOptions[option.name] || ""}
            onValueChange={(value) => handleOptionChange(option.name, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              {isNewFormat
                ? selectOptions.map((opt: any) => {
                    const displayPrice =
                      opt.priceType === "percentage" ? safeParsePrice(opt.price) : getDisplayPrice(safeParsePrice(opt.price));
                    return (
                      <SelectItem key={opt.label} value={opt.label}>
                        <span className="flex items-center justify-between w-full">
                          <span>{opt.label}</span>
                          {safeParsePrice(opt.price) !== 0 && (
                            <span className="ml-3 font-semibold text-blue-400">
                              {opt.priceType === "percentage" ? `+${opt.price}%` : `+${formatPrice(displayPrice)}`}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })
                : selectOptions.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        const checkboxOptions = (option.options as any) || [];
        const isCheckboxNewFormat =
          Array.isArray(checkboxOptions) && checkboxOptions.length > 0 && typeof checkboxOptions[0] === "object";

        if (isCheckboxNewFormat) {
          // Transform options to match CollapsibleCheckboxGroup format
          const transformedOptions = checkboxOptions.map((opt: any) => ({
            label: opt.label,
            price: opt.price,
            priceType: opt.priceType,
          }));

          return (
            <CollapsibleCheckboxGroup
              label={option.label}
              name={option.name}
              options={transformedOptions}
              selectedOptions={selectedOptions}
              onChange={handleOptionChange}
              isRequired={option.is_required}
              formatPrice={(price: number) => {
                const displayPrice = getDisplayPrice(price);
                return formatPrice(displayPrice);
              }}
            />
          );
        }

        // Old single checkbox format
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={option.name}
              checked={selectedOptions[option.name] || false}
              onCheckedChange={(checked) => handleOptionChange(option.name, checked)}
            />
            <Label htmlFor={option.name} className="cursor-pointer">
              {option.label}
              {option.price_modifier > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  +
                  {option.price_modifier_type === "percentage"
                    ? `${option.price_modifier}%`
                    : formatPrice(option.price_modifier)}
                </span>
              )}
            </Label>
          </div>
        );

      case "button_group":
        const buttonGroupOptions = (option.options as any) || [];
        const isButtonNewFormat =
          Array.isArray(buttonGroupOptions) &&
          buttonGroupOptions.length > 0 &&
          typeof buttonGroupOptions[0] === "object";
        
        // Calculate grid columns based on option count and label length
        const getGridCols = () => {
          const count = buttonGroupOptions.length;
          
          // Match grid columns to actual count for 1-3 items
          if (count === 1) return 'grid-cols-1';
          if (count === 2) return 'grid-cols-2';
          if (count === 3) return 'grid-cols-3';
          
          // For 4+ items, use 2 or 3 columns based on label length
          const labels = isButtonNewFormat 
            ? buttonGroupOptions.map((o: any) => o.label || '') 
            : buttonGroupOptions;
          const avgLength = labels.reduce((sum: number, l: string) => sum + l.length, 0) / labels.length;
          
          if (avgLength > 12 || count > 6) return 'grid-cols-2';
          return 'grid-cols-3';
        };
        
        return (
          <div className={`grid ${getGridCols()} gap-2`}>
            {isButtonNewFormat
              ? buttonGroupOptions.map((opt: any, index: number) => {
                  // Button group prices are never modified by other button groups
                  const displayPrice = parseFloat(opt.price);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleOptionChange(option.name, opt.label)}
                      className={`w-full px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg text-center ${
                        selectedOptions[option.name] === opt.label
                          ? "bg-blue-500/10 border-2 border-blue-400/30 text-primary-foreground"
                          : "bg-background/50 border border-white/5 hover:bg-blue-500/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })
              : buttonGroupOptions.map((opt: string, index: number) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleOptionChange(option.name, opt)}
                    className={`w-full px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg text-center ${
                      selectedOptions[option.name] === opt
                        ? "bg-blue-500/10 border-2 border-blue-400/30 text-primary-foreground"
                        : "bg-background/50 border border-white/5 hover:bg-blue-500/5"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={selectedOptions[option.name] || option.default_value || ""}
            onChange={(e) => handleOptionChange(option.name, e.target.value)}
            min={option.min_value || undefined}
            max={option.max_value || undefined}
            placeholder={option.label}
          />
        );

      case "text":
        return (
          <Input
            type="text"
            value={selectedOptions[option.name] || option.default_value || ""}
            onChange={(e) => handleOptionChange(option.name, e.target.value)}
            placeholder={option.label}
          />
        );

      default:
        return null;
    }
  };

  // Create SEO-optimized meta description (150-160 chars)
  // Create fallback meta description for loading state
  const createMetaDescription = () => {
    if (product?.short_description) {
      // Trim to 160 chars max
      return product.short_description.length > 160
        ? product.short_description.substring(0, 157) + "..."
        : product.short_description;
    }
    // Fallback: create from product name, game, and category
    return `Professional ${product?.name || productSlug?.replace(/-/g, ' ')} services for ${game?.name || gameSlug?.replace(/-/g, ' ')}. ${category?.name || categorySlug?.replace(/-/g, ' ')} boost by expert players. Fast, safe, and reliable.`;
  };

  // Create slug-based fallback SEO (used during loading)
  const createFallbackTitle = () => {
    const productName = productSlug?.replace(/-/g, ' ') || 'Service';
    const gameName = gameSlug?.replace(/-/g, ' ') || 'Game';
    return `${productName} | ${gameName} | misti.services`;
  };

  const createFallbackDescription = () => {
    const productName = productSlug?.replace(/-/g, ' ') || 'boost service';
    const gameName = gameSlug?.replace(/-/g, ' ') || 'game';
    return `Professional ${productName} for ${gameName}. Expert players, fast delivery, and safe methods. Trusted gaming boost services.`;
  };

  const getFallbackCanonical = () => {
    return `/game/${gameSlug}/${categorySlug}/${productSlug}`;
  };

  // Determine if we have all loaded data
  const hasFullData = !isLoading && product && game && category;

  // Build structured data only when we have full data
  const buildStructuredData = () => {
    if (!hasFullData) return undefined;
    
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          name: product.name,
          description:
            product.meta_description ||
            product.short_description ||
            `Professional ${product.name} service for ${game.name}`,
          image: product.og_image || product.image_url || "https://misti.services/logo.png",
          brand: {
            "@type": "Organization",
            name: "misti.services",
          },
          offers: {
            "@type": "Offer",
            url: `https://misti.services/game/${gameSlug}/${categorySlug}/${productSlug}`,
            priceCurrency: "USD",
            price: (() => {
              // Calculate minimum price for Google Merchant Center
              if (product.base_price > 0) return product.base_price.toFixed(2);
              if (product.is_slider_product && product.slider_config) {
                const config = product.slider_config;
                if (config.pricing_brackets && config.pricing_brackets.length > 0) {
                  const firstBracket = config.pricing_brackets[0];
                  const minValue = config.min_value || 1;
                  return ((product.base_price + firstBracket.price) * minValue).toFixed(2);
                }
                if (config.price_per_step) return config.price_per_step.toFixed(2);
              }
              return (product.base_price || 0.01).toFixed(2);
            })(),
            availability: "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: "misti.services",
            },
          },
          aggregateRating: globalReviewConfig ? {
            "@type": "AggregateRating",
            ratingValue: globalReviewConfig.average_rating.toString(),
            reviewCount: globalReviewConfig.total_reviews.toString(),
            bestRating: "5",
            worstRating: "1",
          } : {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "326",
            bestRating: "5",
            worstRating: "1",
          },
          category: `${game.name} - ${category.name}`,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://misti.services",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: game.name,
              item: `https://misti.services/game/${gameSlug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `https://misti.services/game/${gameSlug}/${categorySlug}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: product.name,
              item: `https://misti.services/game/${gameSlug}/${categorySlug}/${productSlug}`,
            },
          ],
        },
        // FAQ Schema - only include if product has FAQs
        ...(productFaqs.length > 0 ? [{
          "@type": "FAQPage",
          mainEntity: productFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }] : []),
      ],
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={hasFullData ? (product.meta_title || `${product.name} - ${category.name} | ${game.name} | misti.services`) : createFallbackTitle()}
        description={hasFullData ? (product.meta_description || createMetaDescription()) : createFallbackDescription()}
        canonical={getFallbackCanonical()}
        ogImage={hasFullData ? (product.og_image || product.image_url || game.image_url || undefined) : undefined}
        keywords={hasFullData ? (product.meta_keywords || `${game.name}, ${category.name}, ${product.name}, boost, gaming services`) : undefined}
        structuredData={hasFullData ? buildStructuredData() : undefined}
      />

      <Navigation />

      {isLoading ? (
        isPrerender() ? (
          // SEO-friendly static skeleton for prerender bots (no spinner)
          <div className="container mx-auto px-4 pt-24">
            <div className="space-y-4" aria-hidden="true">
              <div className="h-12 md:h-14 bg-muted/30 rounded w-3/4"></div>
              <div className="h-6 bg-muted/30 rounded w-1/2"></div>
              <div className="h-48 bg-muted/30 rounded"></div>
              <div className="h-32 bg-muted/30 rounded"></div>
            </div>
          </div>
        ) : (
          // Animated spinner for real users
          <div className="container mx-auto px-4 pt-24">
            <div className="space-y-4">
              <div className="h-12 md:h-14 bg-muted/30 rounded animate-pulse w-3/4"></div>
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            </div>
          </div>
        )
      ) : !product || !game || !category ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Product not found</p>
            <Button asChild>
              <Link to="/">Go back home</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <section className="relative pt-24 pb-8 overflow-hidden">
            {/* Hero background with game image */}
            <div className="absolute inset-0 z-0">
              {/* Game hero image */}
              {game.hero_image_url && (
                <img 
                  src={getOptimizedCoverUrl(game.hero_image_url, 1920, 600)} 
                  alt=""
                  className={`absolute inset-0 w-full h-full object-cover opacity-20 ${
                    game.hero_image_position === 'top' ? 'object-top' :
                    game.hero_image_position === 'bottom' ? 'object-bottom' :
                    'object-center'
                  }`}
                  loading="eager"
                  decoding="async"
                  aria-hidden="true"
                />
              )}
              
              {/* Base dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,45%,8%)]/80 via-[hsl(225,40%,10%)]/70 to-background" />
              
              {/* Top purple radial glow */}
              <div 
                className="absolute inset-0 opacity-35"
                style={{
                  background: 'radial-gradient(ellipse at 30% 0%, hsl(250, 45%, 22%) 0%, transparent 55%)',
                }}
              />
              
              {/* Right side blue accent */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'radial-gradient(ellipse at 100% 20%, hsl(210, 60%, 20%) 0%, transparent 40%)',
                }}
              />
            </div>

            <div className="relative z-10 max-w-[1536px] mx-auto px-4 xl:px-6">
              <div className="mb-4">
                <Breadcrumb
                  items={[
                    { label: "Home Page", href: "/" },
                    { label: game.name, href: `/game/${gameSlug}` },
                    { label: category.name, href: `/game/${gameSlug}/${categorySlug}` },
                    { label: product.name },
                  ]}
                />
              </div>

              <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-2 min-h-[3rem]">{product.name}</h1>
                <p className="text-xl text-muted-foreground mb-4">{product.short_description || ""}</p>


                {/* Review Platform Badges */}
                <div className="mb-6 flex justify-start scale-[0.85] origin-left">
                  <TrustBadges showDescription={false} priority="high" />
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trustBadges.map((badge, index) => {
                  const IconComponent = getIconByName(badge.icon_name);
                  // Color accent mapping per icon
                  const accentMap: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
                    Shield: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
                    ShieldCheck: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
                    Lock: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
                    CheckCircle: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500", shadow: "hover:shadow-emerald-500/20" },
                    Coins: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-l-amber-500", shadow: "hover:shadow-amber-500/20" },
                    Gift: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-l-amber-500", shadow: "hover:shadow-amber-500/20" },
                    Award: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-l-amber-500", shadow: "hover:shadow-amber-500/20" },
                    Trophy: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-l-amber-500", shadow: "hover:shadow-amber-500/20" },
                    Eye: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-l-blue-500", shadow: "hover:shadow-blue-500/20" },
                    Zap: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-l-blue-500", shadow: "hover:shadow-blue-500/20" },
                    Rocket: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-l-blue-500", shadow: "hover:shadow-blue-500/20" },
                    UserCheck: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-l-purple-500", shadow: "hover:shadow-purple-500/20" },
                    Headphones: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-l-purple-500", shadow: "hover:shadow-purple-500/20" },
                    MessageCircle: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-l-purple-500", shadow: "hover:shadow-purple-500/20" },
                  };
                  const defaultAccent = { bg: "bg-primary/15", text: "text-primary", border: "border-l-primary", shadow: "hover:shadow-primary/20" };
                  const accent = accentMap[badge.icon_name] || defaultAccent;
                  return (
                    <Card
                      key={badge.id || index}
                      className={`border-l-2 ${accent.border} bg-card/40 backdrop-blur-sm border border-border/30 p-4 
                                 hover:bg-card/60 ${accent.shadow} hover:shadow-lg
                                 transition-all duration-300 group`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${accent.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                          {IconComponent ? (
                            <IconComponent className={`w-5 h-5 ${accent.text}`} />
                          ) : (
                            <Shield className={`w-5 h-5 ${accent.text}`} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-1 text-foreground">{badge.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{badge.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section className="py-8 relative overflow-hidden">
            {/* Multi-layer gradient background */}
            <div className="absolute inset-0 z-0">
              {/* Base: transitions from hero colors to background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(225,40%,10%)] via-[hsl(220,35%,8%)] to-background" />
              
              {/* Radial purple glow - upper area */}
              <div 
                className="absolute inset-0 opacity-25"
                style={{
                  background: 'radial-gradient(ellipse at 20% 10%, hsl(255, 40%, 18%) 0%, transparent 45%)',
                }}
              />
              
              {/* Radial accent - lower right */}
              <div 
                className="absolute inset-0 opacity-15"
                style={{
                  background: 'radial-gradient(ellipse at 90% 70%, hsl(230, 50%, 18%) 0%, transparent 35%)',
                }}
              />
            </div>
            
            <div className="max-w-[1536px] mx-auto px-4 xl:px-6 relative z-10">
              {/* Category Pills - horizontal nav */}
              <div className="mb-6">
                <CategoryPills gameSlug={game.slug} categories={categories} selectedCategory={categorySlug} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
                {/* Main Content */}
                <div className="min-w-0">
                  <Card className="bg-card/90 backdrop-blur-sm border-primary/20 p-6">
                    <Tabs defaultValue="description" className="w-full">
                      <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 pb-4">
                        <TabsTrigger
                          value="description"
                          className="rounded-full px-4 py-2 text-sm font-medium border transition-all duration-300
                            bg-card/40 border-border/30 text-muted-foreground
                            hover:bg-primary/10 hover:border-primary/30
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                            data-[state=active]:border-blue-500/40 data-[state=active]:text-foreground
                            data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        >
                          <FileText className="w-4 h-4 mr-1.5" />
                          Description
                        </TabsTrigger>
                        {productRewards && (
                          <TabsTrigger
                            value="rewards"
                            className="rounded-full px-4 py-2 text-sm font-medium border transition-all duration-300
                              bg-card/40 border-border/30 text-muted-foreground
                              hover:bg-primary/10 hover:border-primary/30
                              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                              data-[state=active]:border-blue-500/40 data-[state=active]:text-foreground
                              data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                          >
                            <Award className="w-4 h-4 mr-1.5" />
                            Rewards
                          </TabsTrigger>
                        )}
                        <TabsTrigger
                          value="how-it-works"
                          className="rounded-full px-4 py-2 text-sm font-medium border transition-all duration-300
                            bg-card/40 border-border/30 text-muted-foreground
                            hover:bg-primary/10 hover:border-primary/30
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                            data-[state=active]:border-blue-500/40 data-[state=active]:text-foreground
                            data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        >
                          <Settings className="w-4 h-4 mr-1.5" />
                          How it works
                        </TabsTrigger>
                        <TabsTrigger
                          value="requirements"
                          className="rounded-full px-4 py-2 text-sm font-medium border transition-all duration-300
                            bg-card/40 border-border/30 text-muted-foreground
                            hover:bg-primary/10 hover:border-primary/30
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                            data-[state=active]:border-blue-500/40 data-[state=active]:text-foreground
                            data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        >
                          <ListChecks className="w-4 h-4 mr-1.5" />
                          Requirements
                        </TabsTrigger>
                        <TabsTrigger
                          value="reviews"
                          className="rounded-full px-4 py-2 text-sm font-medium border transition-all duration-300
                            bg-card/40 border-border/30 text-muted-foreground
                            hover:bg-primary/10 hover:border-primary/30
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                            data-[state=active]:border-blue-500/40 data-[state=active]:text-foreground
                            data-[state=active]:shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                        >
                          <Star className="w-4 h-4 mr-1.5" />
                          Reviews
                        </TabsTrigger>
                      </TabsList>

                      <div className="lg:max-h-[800px] lg:overflow-y-auto custom-scrollbar">
                      <TabsContent value="description" className="space-y-4 mt-0">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Product Description
                </h3>
                        {isMobile ? (
                          <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
                            <div
                              className={`text-foreground/90 leading-relaxed prose prose-sm max-w-none ${!isDescriptionOpen ? "line-clamp-3" : ""}`}
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(product.description || "No description available."),
                              }}
                            />
                            <CollapsibleTrigger className="flex items-center gap-2 text-primary font-medium mt-3 hover:underline">
                              {isDescriptionOpen ? "Read less" : "Read more"}
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isDescriptionOpen ? "rotate-180" : ""}`}
                              />
                            </CollapsibleTrigger>
                          </Collapsible>
                        ) : (
                          <div
                            className="text-foreground/90 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(product.description || "No description available."),
                            }}
                          />
                        )}
                        
                        {/* Parent/Related Product Link */}
                        {product.parent_link && (
                          <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-primary/20">
                            <Link 
                              to={product.parent_link} 
                              className="text-primary hover:underline flex items-center gap-2 font-medium"
                            >
                              <Link2 className="h-4 w-4" />
                              View Related Product
                            </Link>
                          </div>
                        )}
                      </TabsContent>

                      {productRewards && (
                        <TabsContent value="rewards" className="space-y-4 mt-0">
                          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Award className="w-6 h-6 text-primary" />
                            Rewards & Benefits
                          </h3>
                          <div
                            className="text-foreground/90 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(productRewards.rewards_content) }}
                          />
                        </TabsContent>
                      )}

                      <TabsContent value="how-it-works" className="space-y-4 mt-0">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Settings className="w-6 h-6 text-primary" />
                  How It Works
                </h3>
                        <div
                          className="text-foreground/90 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(product.how_it_works || "Information coming soon."),
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="requirements" className="space-y-4 mt-0">
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <ListChecks className="w-6 h-6 text-primary" />
                  Requirements
                </h3>
                        <div
                          className="text-foreground/90 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(product.requirements || "No specific requirements."),
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="reviews" className="space-y-4 mt-0">
                <h3 className="text-2xl font-bold mb-4 text-foreground flex items-center justify-center gap-2">
                  <Star className="w-6 h-6 text-primary" />
                  Customer Reviews
                </h3>
                        <TrustBadges priority="low" />
                      </TabsContent>
                      </div>
                    </Tabs>
                  </Card>
                </div>

                {/* Right Sidebar - Configuration */}
                <div className="self-start">
                  {extrasLoading ? (
                    <SliderConfiguratorSkeleton />
                  ) : product.is_slider_product && product.slider_config ? (
                    <Suspense fallback={<SliderConfiguratorSkeleton />}>
                      {product.slider_config.slider_type === "single" ? (
                        <SingleEndpointSliderConfigurator
                          sliderConfig={product.slider_config as any}
                          basePrice={product.base_price}
                          productOptions={productOptions as any[]}
                          productName={product.name}
                          productData={{
                            start_time_text: product.start_time_text,
                            start_time_value: product.start_time_value,
                            delivery_text: product.delivery_text,
                            delivery_value: product.delivery_value,
                          }}
                          onAddToCart={async (configOptions, price) => {
                            setAddingToCart(true);
                            try {
                              const {
                                data: { session },
                              } = await supabase.auth.getSession();
                              if (!session) {
                                setShowLoginPrompt(true);
                                return false;
                              }

                              return await addToCart({
                                product_id: product.id,
                                product_name: product.name,
                                product_image: product.image_url,
                                quantity: 1,
                                base_price: product.base_price,
                                selected_options: configOptions,
                                total_price: price,
                              });
                            } finally {
                              setAddingToCart(false);
                            }
                          }}
                        />
                      ) : (
                        <SliderProductConfigurator
                          sliderConfig={product.slider_config as any}
                          basePrice={product.base_price}
                          productOptions={productOptions as any[]}
                          productName={product.name}
                          productData={{
                            start_time_text: product.start_time_text,
                            start_time_value: product.start_time_value,
                            delivery_text: product.delivery_text,
                            delivery_value: product.delivery_value,
                          }}
                          onAddToCart={async (configOptions, price) => {
                            setAddingToCart(true);
                            try {
                              const {
                                data: { session },
                              } = await supabase.auth.getSession();
                              if (!session) {
                                setShowLoginPrompt(true);
                                return false;
                              }

                              return await addToCart({
                                product_id: product.id,
                                product_name: product.name,
                                product_image: product.image_url,
                                quantity: 1,
                                base_price: product.base_price,
                                selected_options: configOptions,
                                total_price: price,
                              });
                            } finally {
                              setAddingToCart(false);
                            }
                          }}
                        />
                      )}
                    </Suspense>
                  ) : (
                    <Card className="group bg-card/60 backdrop-blur-sm border-border/40 hover:border-primary/40 p-6 relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                      {/* Top gradient accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
                      {/* Bottom subtle line */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                      {/* Corner accents (appear on hover) */}
                      <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 border-blue-500/40 rounded-tl-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 border-purple-500/40 rounded-br-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Configure Your Order
                      </h3>
                      <div className="h-0.5 w-16 bg-gradient-to-r from-blue-500 to-purple-500 mb-4 rounded-full" />

                      {/* Product Options */}
                      {productOptions.length > 0 ? (
                        <div className="space-y-4 mb-6">
                          {productOptions.map((option) => (
                            <div key={option.id}>
                              <Label className="text-base font-semibold mb-2 block">
                                {option.label}
                                {option.is_required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              {renderOptionInput(option)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-6">
                          No configuration options available for this product.
                        </p>
                      )}

                      {/* Start Time and Delivery Info */}
                      <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-border">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Start Time:</div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground">
                              {product.start_time_text || "15 minutes"}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Delivery:</div>
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground">{product.delivery_text || "Flexible"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price Summary - Redesigned */}
                      <div className="relative border-t border-border/30 pt-5 mb-6 -mx-6 px-6">
                        {/* Gradient accent line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        
                        <div className="space-y-3">
                          {/* Base Price Row */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground/70 font-medium">Base Price</span>
                            <span className="text-sm font-bold text-foreground">{formatPrice(product.base_price)}</span>
                          </div>
                          
                          {/* Options Row */}
                          {productOptions.some((opt) => opt.price_modifier !== 0) && (parseFloat(totalPrice) - product.base_price) > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground font-medium">Options</span>
                              <span className="text-sm font-semibold text-primary">
                                +{formatPrice(parseFloat(totalPrice) - product.base_price)}
                              </span>
                            </div>
                          )}
                          
                          {/* Divider before total */}
                          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent my-2" />
                          
                          {/* Total Row - Prominent */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                              Total
                            </span>
                            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent transition-all duration-300 animate-in fade-in">
                              {formatPrice(parseFloat(totalPrice))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Buttons - Glassmorphism */}
                      <div className="space-y-3">
                        <Button
                          className="w-full bg-primary/20 backdrop-blur-sm border border-primary/40 text-primary hover:bg-primary/30 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                          size="lg"
                          onClick={async () => {
                            setAddingToCart(true);
                            try {
                              const {
                                data: { session },
                              } = await supabase.auth.getSession();
                              if (!session) {
                                setShowLoginPrompt(true);
                                return;
                              }

                              await addToCart({
                                product_id: product.id,
                                product_name: product.name,
                                product_image: product.image_url,
                                quantity: 1,
                                base_price: product.base_price,
                                selected_options: selectedOptions,
                                total_price: parseFloat(totalPrice),
                              });
                            } finally {
                              setAddingToCart(false);
                            }
                          }}
                          disabled={addingToCart}
                        >
                          {addingToCart ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Adding to cart...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5 mr-2" />
                              Add to Cart - {formatPrice(parseFloat(totalPrice))}
                            </>
                          )}
                        </Button>
                      </div>

                      <ProductSupportSection productName={product.name} />
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Lazy-loaded FAQ Section - uses pre-fetched FAQs */}
          <LazyFAQSection product={product} faqs={productFaqs} />

          {/* Lazy-loaded Popular Products Section */}
          <LazyPopularProducts product={product} category={category} />

          <Footer />

          <LoginPromptDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt} returnUrl={location.pathname} />
        </>
      )}
    </div>
  );
};

export default ProductDetail;
