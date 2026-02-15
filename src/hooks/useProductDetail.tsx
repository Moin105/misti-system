import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GlobalReviewConfig {
  average_rating: number;
  total_reviews: number;
}

interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
}

interface ProductDetailData {
  game: any;
  category: any;
  categories: any[];
  product: any;
  productOptions: any[];
  productRewards: { rewards_content: string } | null;
  trustBadges: any[];
  deletedPaths: Set<string>;
  globalReviewConfig: GlobalReviewConfig | null;
  productFaqs: ProductFAQ[];
}

export const fetchProductDetailData = async (
  gameSlug: string,
  categorySlug: string,
  productSlug: string
): Promise<ProductDetailData | null> => {
  // Build all potential deleted URL paths upfront for batch checking
  const gamePath = `/game/${gameSlug}`;
  const categoryPath = `/game/${gameSlug}/${categorySlug}`;
  const productPath = `/game/${gameSlug}/${categorySlug}/${productSlug}`;

  // OPTIMIZED: Single parallel fetch for ALL independent data
  // This reduces 4 sequential phases to just 2 by fetching everything we can upfront
  const [
    gameResult,
    trustBadgesResult,
    deletedUrlsResult,
    reviewConfigResult,
    // Fetch all categories for the game slug in one query (we'll filter client-side)
    allCategoriesResult,
  ] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("slug", gameSlug)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("product_trust_badges")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("deleted_urls")
      .select("url_path")
      .in("url_path", [gamePath, categoryPath, productPath]),
    supabase
      .from("global_review_config")
      .select("average_rating, total_reviews")
      .eq("is_active", true)
      .maybeSingle(),
    // Fetch categories by joining through games table using slug
    supabase
      .from("games")
      .select(`
        id,
        categories!inner(*)
      `)
      .eq("slug", gameSlug)
      .eq("is_active", true)
      .eq("categories.is_active", true)
      .maybeSingle(),
  ]);

  const deletedPaths = new Set(
    (deletedUrlsResult.data || []).map((d) => d.url_path)
  );

  const globalReviewConfig = reviewConfigResult.data;

  if (!gameResult.data) {
    return {
      game: null,
      category: null,
      categories: [],
      product: null,
      productOptions: [],
      productRewards: null,
      trustBadges: trustBadgesResult.data || [],
      deletedPaths,
      globalReviewConfig,
      productFaqs: [],
    };
  }

  const game = gameResult.data;
  
  // Extract categories from the joined result and sort them
  const allCategories = (allCategoriesResult.data?.categories || []).sort(
    (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
  );
  
  // Find the specific category by slug from already-fetched data
  const category = allCategories.find((c: any) => c.slug === categorySlug) || null;

  if (!category) {
    return {
      game,
      category: null,
      categories: allCategories,
      product: null,
      productOptions: [],
      productRewards: null,
      trustBadges: trustBadgesResult.data || [],
      deletedPaths,
      globalReviewConfig,
      productFaqs: [],
    };
  }

  // PHASE 2: Fetch product with options, rewards, and FAQs in parallel
  // We need category.id for the product query, so this must be a second phase
  const [productResult, rewardsResult, faqsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_options(*)")
      .eq("slug", productSlug)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .maybeSingle(),
    // Optimistically fetch rewards by product slug + category for products table
    // We'll use a subquery approach
    supabase
      .from("products")
      .select(`
        id,
        product_rewards!inner(rewards_content, is_approved)
      `)
      .eq("slug", productSlug)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .eq("product_rewards.is_approved", true)
      .maybeSingle(),
    // Optimistically fetch FAQs by product slug + category
    supabase
      .from("products")
      .select(`
        id,
        product_faqs!inner(id, question, answer, sort_order, is_active)
      `)
      .eq("slug", productSlug)
      .eq("category_id", category.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!productResult.data) {
    return {
      game,
      category,
      categories: allCategories,
      product: null,
      productOptions: [],
      productRewards: null,
      trustBadges: trustBadgesResult.data || [],
      deletedPaths,
      globalReviewConfig,
      productFaqs: [],
    };
  }

  const productData = productResult.data;
  
  // Extract product options from joined result and sort them
  const productOptions = (productData.product_options || []).sort(
    (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  // Remove product_options from product object to keep it clean
  const { product_options: _, ...product } = productData;

  // Extract rewards from joined result
  const rewardsData = rewardsResult.data?.product_rewards;
  const productRewards = rewardsData ? { rewards_content: rewardsData.rewards_content } : null;
  
  // Extract FAQs from joined result, filter active and sort
  const faqsData = faqsResult.data?.product_faqs || [];
  const productFaqs = faqsData
    .filter((f: any) => f.is_active)
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((f: any) => ({ id: f.id, question: f.question, answer: f.answer }));

  return {
    game,
    category,
    categories: allCategories,
    product,
    productOptions,
    productRewards,
    trustBadges: trustBadgesResult.data || [],
    deletedPaths,
    globalReviewConfig,
    productFaqs,
  };
};

export const useProductDetail = (
  gameSlug: string | undefined,
  categorySlug: string | undefined,
  productSlug: string | undefined
) => {
  return useQuery({
    queryKey: ["productDetail", gameSlug, categorySlug, productSlug],
    queryFn: async () => {
      if (!gameSlug || !categorySlug || !productSlug) {
        return null;
      }
      return fetchProductDetailData(gameSlug, categorySlug, productSlug);
    },
    enabled: !!gameSlug && !!categorySlug && !!productSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes - don't refetch if data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
  });
};

// Prefetch function for route preloading
export const prefetchProductDetail = (
  queryClient: ReturnType<typeof useQueryClient>,
  gameSlug: string,
  categorySlug: string,
  productSlug: string
) => {
  return queryClient.prefetchQuery({
    queryKey: ["productDetail", gameSlug, categorySlug, productSlug],
    queryFn: () => fetchProductDetailData(gameSlug, categorySlug, productSlug),
    staleTime: 10 * 60 * 1000,
  });
};
