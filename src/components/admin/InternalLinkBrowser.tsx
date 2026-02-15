import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Search, Copy, ChevronDown, ChevronRight, Folder, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductLink {
  id: string;
  name: string;
  slug: string;
  gameSlug: string;
  gameName: string;
  categorySlug: string;
  categoryName: string;
}

interface InternalLinkBrowserProps {
  currentProductId?: string;
  onSelectLink?: (link: string) => void;
}

export const InternalLinkBrowser = ({ currentProductId, onSelectLink }: InternalLinkBrowserProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && products.length === 0) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, slug,
        categories!inner(slug, name, games!inner(slug, name))
      `)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Failed to fetch products for link browser:", error);
      setLoading(false);
      return;
    }

    const formattedProducts: ProductLink[] = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      gameSlug: p.categories.games.slug,
      gameName: p.categories.games.name,
      categorySlug: p.categories.slug,
      categoryName: p.categories.name,
    }));

    setProducts(formattedProducts);
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.gameName.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Group products by game, then by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, { gameName: string; gameSlug: string; categories: Record<string, { categoryName: string; categorySlug: string; products: ProductLink[] }> }> = {};

    filteredProducts.forEach((p) => {
      // Skip current product
      if (p.id === currentProductId) return;

      if (!groups[p.gameSlug]) {
        groups[p.gameSlug] = {
          gameName: p.gameName,
          gameSlug: p.gameSlug,
          categories: {},
        };
      }

      if (!groups[p.gameSlug].categories[p.categorySlug]) {
        groups[p.gameSlug].categories[p.categorySlug] = {
          categoryName: p.categoryName,
          categorySlug: p.categorySlug,
          products: [],
        };
      }

      groups[p.gameSlug].categories[p.categorySlug].products.push(p);
    });

    return groups;
  }, [filteredProducts, currentProductId]);

  const toggleGame = (gameSlug: string) => {
    setExpandedGames((prev) => {
      const next = new Set(prev);
      if (next.has(gameSlug)) {
        next.delete(gameSlug);
      } else {
        next.add(gameSlug);
      }
      return next;
    });
  };

  const copyLink = (product: ProductLink) => {
    const link = `/game/${product.gameSlug}/${product.categorySlug}/${product.slug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: link,
    });
    if (onSelectLink) {
      onSelectLink(link);
    }
  };

  const gameCount = Object.keys(groupedProducts).length;
  const productCount = filteredProducts.filter((p) => p.id !== currentProductId).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between" type="button">
          <span className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Internal Link Browser
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading products...
            </div>
          ) : productCount === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {searchQuery ? "No products found" : "No products available"}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {productCount} products in {gameCount} games • Click to copy link
              </p>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {Object.entries(groupedProducts).map(([gameSlug, game]) => (
                    <div key={gameSlug}>
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm font-medium"
                        onClick={() => toggleGame(gameSlug)}
                      >
                        {expandedGames.has(gameSlug) ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <Folder className="w-4 h-4 text-primary" />
                        {game.gameName}
                      </button>

                      {expandedGames.has(gameSlug) && (
                        <div className="ml-4 space-y-1">
                          {Object.entries(game.categories).map(([catSlug, category]) => (
                            <div key={catSlug} className="ml-2">
                              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground font-medium">
                                <Folder className="w-3 h-3" />
                                {category.categoryName}
                              </div>
                              <div className="ml-4 space-y-0.5">
                                {category.products.map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded hover:bg-primary/10 text-sm group"
                                    onClick={() => copyLink(product)}
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <File className="w-3 h-3 text-muted-foreground" />
                                      <span className="truncate">{product.name}</span>
                                    </span>
                                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
