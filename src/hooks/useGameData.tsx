import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  hero_image_position: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  game_platform: string | null;
  robots: string | null;
  canonical_url: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  game_id: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  meta_description: string | null;
  base_price: number;
  image_url: string | null;
  badge_text: string | null;
  category_id: string;
}

/**
 * OPTIMIZED: Fetch game with categories in a SINGLE query using JOINs
 * Eliminates waterfall: game → categories
 */
export const fetchGameWithCategoriesData = async (gameSlug: string) => {
  // Single query that fetches game with embedded categories
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      *,
      categories(*)
    `)
    .eq("slug", gameSlug.trim().toLowerCase())
    .eq("is_active", true)
    .eq("categories.is_active", true)
    .order("sort_order", { referencedTable: "categories", ascending: true })
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) return { game: null, categories: [] };

  // Extract categories from nested result and flatten game
  const { categories: nestedCategories, ...gameData } = game;

  return {
    game: gameData as Game,
    categories: (nestedCategories || []) as Category[],
  };
};

/**
 * OPTIMIZED: Fetch products by game and category slugs directly
 * Eliminates waterfall: game → categories → products
 * Uses JOIN query to get products in one database round-trip
 */
export const fetchProductsBySlug = async (
  gameSlug: string,
  categorySlug: string | undefined,
  page: number = 1,
  itemsPerPage: number = 12
): Promise<{ products: Product[]; total: number }> => {
  const offset = (page - 1) * itemsPerPage;

  if (categorySlug) {
    // Specific category - use JOIN with category and game slugs
    const { data, error, count } = await supabase
      .from("products")
      .select(`
        *,
        category:categories!inner(
          slug,
          game:games!inner(slug)
        )
      `, { count: 'exact' })
      .eq("is_active", true)
      .eq("category.slug", categorySlug)
      .eq("category.game.slug", gameSlug)
      .order("created_at", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    if (error) throw error;

    // Flatten the nested structure for compatibility
    const products = (data || []).map((p: any) => {
      const { category: _, ...product } = p;
      return product;
    });

    return { products: products as Product[], total: count || 0 };
  } else {
    // All categories for game - use JOIN with game slug only
    const { data, error, count } = await supabase
      .from("products")
      .select(`
        *,
        category:categories!inner(
          slug,
          game:games!inner(slug)
        )
      `, { count: 'exact' })
      .eq("is_active", true)
      .eq("category.game.slug", gameSlug)
      .order("created_at", { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    if (error) throw error;

    // Flatten the nested structure for compatibility
    const products = (data || []).map((p: any) => {
      const { category: _, ...product } = p;
      return product;
    });

    return { products: products as Product[], total: count || 0 };
  }
};

/**
 * Hook to fetch products by slug directly (no categoryIds dependency)
 * This is the OPTIMIZED version that eliminates the waterfall
 */
export const useProductsBySlug = (
  gameSlug: string | undefined,
  categorySlug: string | undefined,
  page: number = 1,
  itemsPerPage: number = 12
) => {
  return useQuery({
    queryKey: ['productsBySlug', gameSlug, categorySlug, page],
    queryFn: async () => {
      if (!gameSlug) return { products: [], total: 0 };
      return fetchProductsBySlug(gameSlug, categorySlug, page, itemsPerPage);
    },
    enabled: !!gameSlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Optimized: Fetch game and categories in a single query to eliminate waterfall
export const useGameWithCategories = (gameSlug: string | undefined) => {
  return useQuery({
    queryKey: ['gameWithCategories', gameSlug],
    queryFn: async () => {
      if (!gameSlug) throw new Error("Game slug is required");
      return fetchGameWithCategoriesData(gameSlug);
    },
    enabled: !!gameSlug,
    staleTime: 15 * 60 * 1000, // 15 minutes - increased for better caching
  });
};

// Prefetch function for route preloading
export const prefetchGameWithCategories = (
  queryClient: ReturnType<typeof useQueryClient>,
  gameSlug: string
) => {
  return queryClient.prefetchQuery({
    queryKey: ['gameWithCategories', gameSlug],
    queryFn: () => fetchGameWithCategoriesData(gameSlug),
    staleTime: 15 * 60 * 1000,
  });
};

export const useGame = (gameSlug: string | undefined) => {
  return useQuery({
    queryKey: ['game', gameSlug],
    queryFn: async () => {
      if (!gameSlug) throw new Error("Game slug is required");

      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("slug", gameSlug.trim().toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Game not found");

      return data as Game;
    },
    enabled: !!gameSlug,
    staleTime: 15 * 60 * 1000, // 15 minutes - increased
  });
};

export const useGameCategories = (gameId: string | undefined) => {
  return useQuery({
    queryKey: ['categories', gameId],
    queryFn: async () => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("game_id", gameId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!gameId,
    staleTime: 15 * 60 * 1000, // 15 minutes - increased
  });
};

interface ProductsResult {
  products: Product[];
  total: number;
}

/**
 * Fetch products for a game, optionally filtered by category.
 * 
 * @param categoryIds - All category IDs for the game
 * @param selectedCategoryId - Specific category ID to filter by (if viewing a category page)
 * @param page - Pagination page number
 * @param itemsPerPage - Items per page
 */
export const useGameProducts = (
  categoryIds: string[],
  selectedCategoryId: string | undefined,
  page: number = 1,
  itemsPerPage: number = 12
) => {
  return useQuery<ProductsResult>({
    queryKey: ['products', categoryIds, selectedCategoryId, page],
    queryFn: async (): Promise<ProductsResult> => {
      if (!categoryIds.length) return { products: [], total: 0 };

      let query = supabase
        .from("products")
        .select("*", { count: 'exact' })
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Filter by specific category if provided, otherwise get all categories
      if (selectedCategoryId) {
        query = query.eq("category_id", selectedCategoryId);
      } else {
        query = query.in("category_id", categoryIds);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        products: (data || []) as Product[],
        total: count || 0,
      };
    },
    enabled: categoryIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
