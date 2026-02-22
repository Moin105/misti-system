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

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeOptionValues = (raw: unknown): unknown[] => {
  if (raw == null) return [];

  // DB may return options as a JSON string instead of an array.
  if (typeof raw === "string") {
    const parsed = tryParseJson(raw);
    if (parsed === raw) return [raw];
    return normalizeOptionValues(parsed);
  }

  if (!Array.isArray(raw)) {
    return [raw];
  }

  // Handle arrays containing a single serialized JSON payload.
  if (raw.length === 1 && typeof raw[0] === "string") {
    const parsed = tryParseJson(raw[0]);
    if (parsed !== raw[0]) return normalizeOptionValues(parsed);
  }

  const normalized: unknown[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const parsed = tryParseJson(item);
      if (Array.isArray(parsed)) {
        normalized.push(...normalizeOptionValues(parsed));
      } else {
        normalized.push(parsed);
      }
      continue;
    }
    normalized.push(item);
  }
  return normalized;
};

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

  const normalizedProductOptions = (optionsResult.data || []).map((option: any) => ({
    ...option,
    options: normalizeOptionValues(option.options),
  }));

  return {
    productOptions: normalizedProductOptions,
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
