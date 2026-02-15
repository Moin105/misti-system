import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Game {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  icon_url: string | null;
  is_popular: boolean;
  sort_order: number | null;
  meta_description: string | null;
}

interface ReviewConfig {
  average_rating: number;
  total_reviews: number;
}

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
}

interface CookieBannerConfig {
  id: string;
  heading: string;
  description: string;
  accept_button_text: string;
  reject_button_text: string;
  customize_button_text: string;
  banner_position: string;
  is_active: boolean;
}

interface ReviewPlatform {
  id: string;
  name: string;
  url: string;
  primary_color: string;
  sort_order: number;
}

interface InitialPageData {
  games: Game[];
  reviewConfig: ReviewConfig | null;
  exchangeRates: ExchangeRate[];
  cookieBannerConfig: CookieBannerConfig | null;
  reviewPlatforms: ReviewPlatform[];
}

/**
 * Consolidated hook that fetches all critical initial page data in a single batch.
 * This reduces API round-trips from 5+ separate queries to 1, improving initial load time.
 */
export function useInitialPageData() {
  return useQuery<InitialPageData>({
    queryKey: ["initial-page-data"],
    queryFn: async () => {
      // Fetch all critical data in parallel within a single query function
      const [gamesRes, reviewRes, ratesRes, cookieConfigRes, platformsRes] = await Promise.all([
        supabase
          .from("games")
          .select("id, name, slug, image_url, icon_url, is_popular, sort_order, meta_description")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("global_review_config")
          .select("average_rating, total_reviews")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("exchange_rates")
          .select("base_currency, target_currency, rate"),
        supabase
          .from("cookie_banner_config")
          .select("*")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("review_platforms")
          .select("id, name, url, primary_color, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      return {
        games: gamesRes.data || [],
        reviewConfig: reviewRes.data as ReviewConfig | null,
        exchangeRates: ratesRes.data || [],
        cookieBannerConfig: cookieConfigRes.data as CookieBannerConfig | null,
        reviewPlatforms: platformsRes.data || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });
}

// Selector hooks to extract specific data from the consolidated query
export function useGames() {
  const { data, isLoading, error } = useInitialPageData();
  return {
    games: data?.games || [],
    isLoading,
    error,
  };
}

export function useReviewConfig() {
  const { data, isLoading } = useInitialPageData();
  return {
    reviewConfig: data?.reviewConfig || null,
    isLoading,
  };
}

export function useExchangeRates() {
  const { data, isLoading } = useInitialPageData();
  return {
    rates: data?.exchangeRates || [],
    loading: isLoading,
  };
}

export function useCookieBannerConfig() {
  const { data, isLoading } = useInitialPageData();
  return {
    config: data?.cookieBannerConfig || null,
    isLoading,
  };
}

export function useReviewPlatforms() {
  const { data, isLoading } = useInitialPageData();
  return {
    platforms: data?.reviewPlatforms || [],
    isLoading,
  };
}
