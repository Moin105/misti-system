import { Link } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getOptimizedCoverUrl } from "@/lib/imageOptimization";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { prefetchProductDetail } from "@/hooks/useProductDetail";

interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  base_price: number;
  image_url: string;
  image_alt_text: string;
  badge_text: string;
  trust_score: number;
  total_sales: number;
  is_manually_popular: boolean;
  category_slug?: string;
  game_slug?: string;
}

interface PopularProductsProps {
  currentProductId: string;
  categoryId: string;
}

const fetchPopularProducts = async (categoryId: string, currentProductId: string): Promise<Product[]> => {
  // Get game_id first, then fetch all products in one query
  const { data: categoryData } = await supabase
    .from("categories")
    .select("game_id")
    .eq("id", categoryId)
    .single();

  if (!categoryData) return [];

  // Single optimized query with joins
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories!inner(
        slug,
        game_id,
        games!inner(slug)
      )
    `)
    .eq("categories.game_id", categoryData.game_id)
    .neq("id", currentProductId)
    .eq("is_active", true)
    .or("is_manually_popular.eq.true,total_sales.gt.0")
    .order("is_manually_popular", { ascending: false, nullsFirst: false })
    .order("total_sales", { ascending: false })
    .limit(4);

  if (error) throw error;

  // Filter to only show products that are manually popular OR have sales AND have valid slugs
  const filteredData = data?.filter(p => 
    p.slug && // Must have a valid slug
    (p.is_manually_popular || (p.total_sales && p.total_sales > 0))
  ).map(p => ({
    ...p,
    category_slug: p.categories?.slug,
    game_slug: p.categories?.games?.slug
  })).slice(0, 4);

  return filteredData || [];
};

export const PopularProducts = ({ currentProductId, categoryId }: PopularProductsProps) => {
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["popular-products", categoryId, currentProductId],
    queryFn: () => fetchPopularProducts(categoryId, currentProductId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    enabled: !!categoryId && !!currentProductId,
  });

  // Prefetch product detail on hover
  const handleProductHover = useCallback((product: Product) => {
    if (product.game_slug && product.category_slug && product.slug) {
      prefetchProductDetail(queryClient, product.game_slug, product.category_slug, product.slug);
    }
  }, [queryClient]);

  if (isLoading || products.length === 0) return null;

  return (
    <section className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Popular Services
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link 
              key={product.id} 
              to={`/game/${product.game_slug}/${product.category_slug}/${product.slug}`}
              onMouseEnter={() => handleProductHover(product)}
            >
              <Card className="group relative overflow-hidden border-border bg-card-gradient hover:border-primary/50 transition-all duration-300 cursor-pointer h-full">
                <div className="relative h-48 overflow-hidden bg-muted">
                  {product.image_url ? (
                    <img
                      src={getOptimizedCoverUrl(product.image_url, 400, 300)}
                      alt={product.image_alt_text || product.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      width="400"
                      height="300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  {product.badge_text && (
                    <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                      {product.badge_text}
                    </Badge>
                  )}
                  {product.is_manually_popular && (
                    <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-medium">{product.trust_score}</span>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatPrice(product.base_price)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
