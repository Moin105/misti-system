import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchResult = {
  id: string;
  name: string;
  slug: string;
  game_slug: string;
  category_slug: string;
  game_name: string;
  category_name: string;
  base_price: number;
};

async function searchProducts(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      base_price,
      categories!inner (
        name,
        slug,
        games!inner (
          name,
          slug
        )
      )
    `)
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) throw error;

  return (products || []).map((product: any) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    game_slug: product.categories.games.slug,
    category_slug: product.categories.slug,
    game_name: product.categories.games.name,
    category_name: product.categories.name,
    base_price: product.base_price,
  }));
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchProducts(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
