import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
}

interface ProductExtrasData {
  productOptions: any[];
  productRewards: { rewards_content: string } | null;
  trustBadges: any[];
  productFaqs: ProductFAQ[];
}

/**
 * Fetch deferred product data (not critical for LCP):
 * - Product options (for configurator)
 * - Product rewards
 * - Trust badges
 * - FAQs
 */
export const fetchProductExtrasData = async (
  productId: string
): Promise<ProductExtrasData> => {
  // Fetch all extras in parallel
  const [
    optionsResult,
    rewardsResult,
    trustBadgesResult,
    faqsResult,
  ] = await Promise.all([
    supabase
      .from("product_options")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_rewards")
      .select("rewards_content")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .maybeSingle(),
    supabase
      .from("product_trust_badges")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("product_faqs")
      .select("id, question, answer, sort_order")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return {
    productOptions: optionsResult.data || [],
    productRewards: rewardsResult.data,
    trustBadges: trustBadgesResult.data || [],
    productFaqs: (faqsResult.data || []).map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    })),
  };
};

export const useProductExtras = (
  productId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["productExtras", productId],
    queryFn: async () => {
      if (!productId) return null;
      return fetchProductExtrasData(productId);
    },
    enabled: !!productId && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
