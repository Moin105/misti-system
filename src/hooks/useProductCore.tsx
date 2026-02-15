import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductCoreData {
  game: any;
  category: any;
  product: any;
  deletedPaths: Set<string>;
  globalReviewConfig: { average_rating: number; total_reviews: number } | null;
}

/**
 * Fetch core product data (critical for LCP):
 * - Game, category, product in a SINGLE query using JOINs
 * - Deleted paths check
 * - Global review config
 * 
 * OPTIMIZED: Eliminates 3-phase waterfall by using a composite query
 */
export const fetchProductCoreData = async (
  gameSlug: string,
  categorySlug: string,
  productSlug: string
): Promise<ProductCoreData | null> => {
  // Build all potential deleted URL paths upfront
  const gamePath = `/game/${gameSlug}`;
  const categoryPath = `/game/${gameSlug}/${categorySlug}`;
  const productPath = `/game/${gameSlug}/${categorySlug}/${productSlug}`;

  // OPTIMIZED: Fetch product with category and game in ONE query using nested selects
  // Plus deleted_urls and review_config in parallel
  const [
    productResult,
    deletedUrlsResult,
    reviewConfigResult,
  ] = await Promise.all([
    // Single JOIN query: product → category → game
    supabase
      .from("products")
      .select(`
        *,
        category:categories!inner(
          *,
          game:games!inner(*)
        )
      `)
      .eq("slug", productSlug)
      .eq("is_active", true)
      .eq("category.slug", categorySlug)
      .eq("category.is_active", true)
      .eq("category.game.slug", gameSlug)
      .eq("category.game.is_active", true)
      .maybeSingle(),
    supabase
      .from("deleted_urls")
      .select("url_path")
      .in("url_path", [gamePath, categoryPath, productPath]),
    supabase
      .from("global_review_config")
      .select("average_rating, total_reviews")
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const deletedPaths = new Set(
    (deletedUrlsResult.data || []).map((d) => d.url_path)
  );
  const globalReviewConfig = reviewConfigResult.data;

  // Extract nested data from the single query result
  if (!productResult.data) {
    // Product not found - check if parent entities exist for proper 404/410 handling
    // Fetch game separately to determine which level is missing
    const { data: game } = await supabase
      .from("games")
      .select("*")
      .eq("slug", gameSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (!game) {
      return {
        game: null,
        category: null,
        product: null,
        deletedPaths,
        globalReviewConfig,
      };
    }

    // Game exists, check category
    const { data: category } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", game.id)
      .eq("slug", categorySlug)
      .eq("is_active", true)
      .maybeSingle();

    return {
      game,
      category,
      product: null,
      deletedPaths,
      globalReviewConfig,
    };
  }

  // Extract from nested structure
  const productData = productResult.data;
  const categoryData = productData.category;
  const gameData = categoryData.game;

  // Return flattened structure (remove nested references from product)
  const { category: _, ...product } = productData;
  const { game: __, ...category } = categoryData;

  return {
    game: gameData,
    category,
    product,
    deletedPaths,
    globalReviewConfig,
  };
};

export const useProductCore = (
  gameSlug: string | undefined,
  categorySlug: string | undefined,
  productSlug: string | undefined
) => {
  return useQuery({
    queryKey: ["productCore", gameSlug, categorySlug, productSlug],
    queryFn: async () => {
      if (!gameSlug || !categorySlug || !productSlug) return null;
      return fetchProductCoreData(gameSlug, categorySlug, productSlug);
    },
    enabled: !!gameSlug && !!categorySlug && !!productSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Prefetch function for route preloading
export const prefetchProductCore = (
  queryClient: ReturnType<typeof useQueryClient>,
  gameSlug: string,
  categorySlug: string,
  productSlug: string
) => {
  return queryClient.prefetchQuery({
    queryKey: ["productCore", gameSlug, categorySlug, productSlug],
    queryFn: () => fetchProductCoreData(gameSlug, categorySlug, productSlug),
    staleTime: 10 * 60 * 1000,
  });
};
