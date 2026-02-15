import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearAPICache } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar, CheckSquare, Square } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Game {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  game_id: string;
}

interface Product {
  id: string;
  name: string;
  base_price: number;
  category_id: string;
  created_at: string;
}

interface ProductOption {
  id: string;
  product_id: string;
  label: string;
  price_modifier: number;
  options: any;
}

interface SliderProduct {
  id: string;
  name: string;
  base_price: number;
  category_id: string;
  created_at: string;
  slider_config: {
    pricing_brackets?: { start: number; end: number; price: number }[];
    price_per_step?: number;
  } | null;
}

const PriceManager = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sliderProducts, setSliderProducts] = useState<SliderProduct[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [priceChangeType, setPriceChangeType] = useState<'percentage' | 'fixed'>('percentage');
  const [changeValue, setChangeValue] = useState<string>("");
  const [includeSliders, setIncludeSliders] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  // Clear selection and category when game changes
  useEffect(() => {
    setSelectedProductIds(new Set());
    setSelectedCategory("all");
  }, [selectedGame]);

  // Categories for current game
  const gameCategories = useMemo(() => {
    if (!selectedGame) return [];
    return categories.filter(c => c.game_id === selectedGame);
  }, [selectedGame, categories]);

  // Sort function
  const sortProducts = <T extends { name: string; created_at: string }>(list: T[]): T[] => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "date_desc":
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  // Products filtered by selected game + category, then sorted
  const gameProducts = useMemo(() => {
    if (!selectedGame) return { regular: [], sliders: [] };
    const categoryIds = selectedCategory !== "all"
      ? [selectedCategory]
      : gameCategories.map(c => c.id);
    return {
      regular: sortProducts(products.filter(p => categoryIds.includes(p.category_id))),
      sliders: sortProducts(sliderProducts.filter(p => categoryIds.includes(p.category_id)))
    };
  }, [selectedGame, selectedCategory, gameCategories, products, sliderProducts, sortBy]);

  // All product IDs for current game (respecting includeSliders toggle)
  const allProductIds = useMemo(() => {
    return [
      ...gameProducts.regular.map(p => p.id),
      ...(includeSliders ? gameProducts.sliders.map(p => p.id) : [])
    ];
  }, [gameProducts, includeSliders]);

  const fetchData = async () => {
    try {
      const [gamesRes, categoriesRes, productsRes, sliderProductsRes, optionsRes] = await Promise.all([
        supabase.from("games").select("id, name").eq("is_active", true).order("name"),
        supabase.from("categories").select("id, name, game_id").eq("is_active", true).order("name"),
        supabase.from("products")
          .select("id, name, base_price, category_id, created_at")
          .eq("is_active", true)
          .eq("is_slider_product", false)
          .order("created_at", { ascending: false }),
        supabase.from("products")
          .select("id, name, base_price, category_id, slider_config, created_at")
          .eq("is_active", true)
          .eq("is_slider_product", true)
          .order("created_at", { ascending: false }),
        supabase.from("product_options").select("id, product_id, label, price_modifier, options")
      ]);

      if (gamesRes.error) throw gamesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (sliderProductsRes.error) throw sliderProductsRes.error;
      if (optionsRes.error) throw optionsRes.error;

      setGames(gamesRes.data || []);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      setSliderProducts((sliderProductsRes.data || []) as SliderProduct[]);
      setProductOptions(optionsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const toggleProduct = (productId: string) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const selectAll = () => {
    setSelectedProductIds(new Set(allProductIds));
  };

  const deselectAll = () => {
    setSelectedProductIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === allProductIds.length && allProductIds.length > 0) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  // Price calculation supporting both percentage and fixed modes
  const calculateNewPrice = (currentPrice: number, isSlider: boolean = false) => {
    const value = parseFloat(changeValue);
    if (isNaN(value)) return currentPrice;
    
    let newPrice: number;
    if (priceChangeType === 'percentage') {
      newPrice = currentPrice * (1 + value / 100);
    } else {
      newPrice = currentPrice + value;
    }
    
    // Ensure price doesn't go negative
    newPrice = Math.max(0, newPrice);
    
    // 8 decimals for sliders, 2 for regular
    return isSlider 
      ? Math.round(newPrice * 100000000) / 100000000
      : Math.round(newPrice * 100) / 100;
  };

  const handlePreview = () => {
    if (selectedProductIds.size === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to modify",
        variant: "destructive",
      });
      return;
    }
    
    if (!changeValue || parseFloat(changeValue) === 0) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid price change value",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  // Get selected products for preview/apply
  const getSelectedProducts = () => {
    const selectedRegular = gameProducts.regular.filter(p => selectedProductIds.has(p.id));
    const selectedSliders = gameProducts.sliders.filter(p => selectedProductIds.has(p.id));
    return { regular: selectedRegular, sliders: selectedSliders };
  };

  // Count affected options and brackets
  const getAffectedCounts = () => {
    const { regular, sliders } = getSelectedProducts();
    const productIds = [...regular.map(p => p.id), ...sliders.map(p => p.id)];
    const affectedOpts = productOptions.filter(opt => productIds.includes(opt.product_id));
    
    let optCount = 0;
    affectedOpts.forEach(option => {
      if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
        const fixedPriceOptions = option.options.filter((opt: any) => 
          opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0
        );
        optCount += fixedPriceOptions.length;
      } else if (option.price_modifier !== 0) {
        optCount++;
      }
    });

    let bracketsCount = 0;
    sliders.forEach(slider => {
      if (slider.slider_config?.pricing_brackets) {
        bracketsCount += slider.slider_config.pricing_brackets.length;
      }
    });

    return { optionsCount: optCount, bracketsCount };
  };

  const handleApplyChanges = async () => {
    setUpdating(true);
    try {
      const { regular: selectedRegular, sliders: selectedSliders } = getSelectedProducts();
      const productIds = [...selectedRegular.map(p => p.id), ...selectedSliders.map(p => p.id)];
      
      // Update regular product base prices
      const productUpdates = selectedRegular.map(product => ({
        id: product.id,
        base_price: calculateNewPrice(product.base_price, false)
      }));

      for (const update of productUpdates) {
        const { error } = await supabase
          .from("products")
          .update({ base_price: update.base_price })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      // Update product options
      const affectedOptions = productOptions.filter(opt => 
        productIds.includes(opt.product_id)
      );

      let optionUpdateCount = 0;
      for (const option of affectedOptions) {
        // Handle new format with individual option prices
        if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
          const updatedOptions = option.options.map((opt: any) => {
            if (opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0) {
              const updatedPrice = calculateNewPrice(parseFloat(opt.price), false);
              return {
                ...opt,
                price: updatedPrice.toString(),
              };
            }
            return opt;
          });

          const { error } = await supabase
            .from("product_options")
            .update({ options: updatedOptions })
            .eq("id", option.id);
          
          if (error) throw error;
          optionUpdateCount++;
        } 
        else if (option.price_modifier !== 0) {
          const newPriceModifier = calculateNewPrice(option.price_modifier, false);
          const { error } = await supabase
            .from("product_options")
            .update({ price_modifier: newPriceModifier })
            .eq("id", option.id);
          
          if (error) throw error;
          optionUpdateCount++;
        }
      }

      // Update slider products
      let sliderUpdateCount = 0;
      const { bracketsCount } = getAffectedCounts();
      for (const sliderProduct of selectedSliders) {
        const newBasePrice = calculateNewPrice(sliderProduct.base_price, true);
        
        let updatedConfig = sliderProduct.slider_config ? { ...sliderProduct.slider_config } : null;
        
        if (updatedConfig?.pricing_brackets) {
          updatedConfig.pricing_brackets = updatedConfig.pricing_brackets.map(bracket => ({
            ...bracket,
            price: calculateNewPrice(bracket.price, true),
          }));
        }
        
        if (updatedConfig?.price_per_step) {
          updatedConfig.price_per_step = calculateNewPrice(updatedConfig.price_per_step, true);
        }
        
        const { error } = await supabase
          .from("products")
          .update({ 
            base_price: newBasePrice,
            slider_config: updatedConfig 
          })
          .eq("id", sliderProduct.id);
          
        if (error) throw error;
        sliderUpdateCount++;
      }

      const sliderProductsCount = selectedSliders.length;
      const regularProductsCount = productUpdates.length;
      const totalProducts = sliderProductsCount + regularProductsCount;

      const changeTypeLabel = priceChangeType === 'percentage' 
        ? `${parseFloat(changeValue) > 0 ? '+' : ''}${changeValue}%`
        : `${parseFloat(changeValue) > 0 ? '+' : ''}$${parseFloat(changeValue).toFixed(2)}`;

      const message = sliderProductsCount > 0 
        ? `Updated ${totalProducts} product(s) by ${changeTypeLabel}: ${regularProductsCount} regular, ${sliderProductsCount} slider (${bracketsCount} brackets), and ${optionUpdateCount} custom option(s).`
        : `Updated ${regularProductsCount} product(s) by ${changeTypeLabel} and ${optionUpdateCount} custom option(s).`;

      toast({
        title: "Success",
        description: message,
      });

      setShowConfirmDialog(false);
      
      // Clear cache and refresh data instead of full page reload
      await clearAPICache(['/rest/v1/products', '/rest/v1/product_options']);
      await fetchData();
      
      // Reset form
      setChangeValue("");
      setSelectedGame("");
      setSelectedProductIds(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isIncrease = changeValue && parseFloat(changeValue) > 0;
  const isDecrease = changeValue && parseFloat(changeValue) < 0;
  const selectedGame_ = games.find(g => g.id === selectedGame);
  const { regular: previewRegular, sliders: previewSliders } = getSelectedProducts();
  const { optionsCount, bracketsCount } = getAffectedCounts();

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Price Management</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Select a game, choose products, and adjust prices
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Price Adjustment
            </CardTitle>
            <CardDescription>
              Select a game tag, then manually select products to modify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game & Category Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>Game Tag</Label>
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!selectedGame}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {gameCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <RadioGroup
                  value={priceChangeType}
                  onValueChange={(value: 'percentage' | 'fixed') => setPriceChangeType(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="cursor-pointer">Percentage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="cursor-pointer">Fixed Amount</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>{priceChangeType === 'percentage' ? 'Percentage Change' : 'Amount (USD)'}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step={priceChangeType === 'percentage' ? '1' : '0.01'}
                    value={changeValue}
                    onChange={(e) => setChangeValue(e.target.value)}
                    placeholder={priceChangeType === 'percentage' ? 'e.g., 10 or -15' : 'e.g., 5.00 or -2.50'}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {priceChangeType === 'percentage' ? '%' : 'USD'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use positive to increase, negative to decrease
                </p>
              </div>
            </div>

            {selectedGame && (
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                <Switch
                  id="include_sliders"
                  checked={includeSliders}
                  onCheckedChange={setIncludeSliders}
                />
                <Label htmlFor="include_sliders" className="cursor-pointer">
                  Include Slider Products in selection
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection Table */}
        {selectedGame && (gameProducts.regular.length > 0 || gameProducts.sliders.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Products for {selectedGame_?.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {allProductIds.length} product(s) available • {selectedProductIds.size} selected
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">Newest First</SelectItem>
                      <SelectItem value="date_asc">Oldest First</SelectItem>
                      <SelectItem value="name_asc">Name A-Z</SelectItem>
                      <SelectItem value="name_desc">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="gap-2"
                  >
                    {selectedProductIds.size === allProductIds.length && allProductIds.length > 0 ? (
                      <>
                        <Square className="w-4 h-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Select All
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handlePreview} 
                    disabled={selectedProductIds.size === 0 || !changeValue}
                    className="gap-2"
                  >
                    {isIncrease ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : isDecrease ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                    Preview Changes ({selectedProductIds.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedProductIds.size === allProductIds.length && allProductIds.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameProducts.regular.map((product) => (
                      <TableRow 
                        key={product.id}
                        className={selectedProductIds.has(product.id) ? "bg-accent/30" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${product.base_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge>Regular</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {selectedProductIds.has(product.id) && changeValue ? (
                            <span className={isIncrease ? "text-green-600" : isDecrease ? "text-red-600" : ""}>
                              ${calculateNewPrice(product.base_price, false).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {includeSliders && gameProducts.sliders.map((product) => (
                      <TableRow 
                        key={product.id}
                        className={selectedProductIds.has(product.id) ? "bg-accent/30" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          ${product.base_price.toFixed(8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Slider</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(product.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {selectedProductIds.has(product.id) && changeValue ? (
                            <span className={isIncrease ? "text-green-600" : isDecrease ? "text-red-600" : ""}>
                              ${calculateNewPrice(product.base_price, true).toFixed(8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isIncrease ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              Confirm Price Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {isIncrease ? "increase" : "decrease"} prices by{" "}
              <span className="font-bold">
                {priceChangeType === 'percentage' 
                  ? `${Math.abs(parseFloat(changeValue)).toFixed(2)}%`
                  : `$${Math.abs(parseFloat(changeValue)).toFixed(2)}`
                }
              </span>{" "}
              for <span className="font-bold">{previewRegular.length}</span> regular product(s),{" "}
              <span className="font-bold">{optionsCount}</span> custom option(s)
              {previewSliders.length > 0 && (
                <>
                  , and <span className="font-bold">{previewSliders.length}</span> slider product(s) with{" "}
                  <span className="font-bold">{bracketsCount}</span> pricing bracket(s)
                </>
              )}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-4 my-4">
            {previewRegular.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Regular Products ({previewRegular.length})</h4>
                {previewRegular.map((product) => {
                  const productOpts = productOptions.filter(opt => opt.product_id === product.id);
                  
                  const hasFixedPriceOptions = productOpts.some(option => {
                    if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
                      return option.options.some((opt: any) => 
                        opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0
                      );
                    }
                    return option.price_modifier !== 0;
                  });
                  
                  return (
                    <div key={product.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-muted/50">
                        <span className="font-medium">{product.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            ${product.base_price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-bold text-primary">
                            ${calculateNewPrice(product.base_price, false).toFixed(2)}
                          </span>
                          <Badge variant={isIncrease ? "default" : "destructive"}>
                            {priceChangeType === 'percentage'
                              ? `${isIncrease ? "+" : ""}${parseFloat(changeValue).toFixed(2)}%`
                              : `${isIncrease ? "+" : ""}$${parseFloat(changeValue).toFixed(2)}`
                            }
                          </Badge>
                        </div>
                      </div>
                      
                      {hasFixedPriceOptions && (
                        <div className="p-3 space-y-2 bg-background">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Custom Options (fixed-price only):</p>
                          {productOpts.map((option) => {
                            if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
                              const fixedPriceOptions = option.options.filter((opt: any) => 
                                opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0
                              );
                              if (fixedPriceOptions.length === 0) return null;
                              
                              return (
                                <div key={option.id} className="pl-4 space-y-1">
                                  <p className="text-xs font-medium">{option.label}:</p>
                                  {fixedPriceOptions.map((opt: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs pl-2">
                                      <span className="text-muted-foreground">{opt.label || opt.value}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">${parseFloat(opt.price).toFixed(2)}</span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="font-medium">${calculateNewPrice(parseFloat(opt.price), false).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            } else if (option.price_modifier !== 0) {
                              return (
                                <div key={option.id} className="pl-4 flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{option.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">${option.price_modifier.toFixed(2)}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="font-medium">${calculateNewPrice(option.price_modifier, false).toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {previewSliders.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold text-sm text-muted-foreground">Slider Products ({previewSliders.length})</h4>
                {previewSliders.map((product) => {
                  const sliderOpts = productOptions.filter(opt => opt.product_id === product.id);
                  
                  const hasFixedPriceOptions = sliderOpts.some(option => {
                    if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
                      return option.options.some((opt: any) => 
                        opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0
                      );
                    }
                    return option.price_modifier !== 0;
                  });
                  
                  return (
                    <div key={product.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-muted/50">
                        <span className="font-medium">{product.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            ${product.base_price.toFixed(8)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-bold text-primary">
                            ${calculateNewPrice(product.base_price, true).toFixed(8)}
                          </span>
                          <Badge variant={isIncrease ? "default" : "destructive"}>
                            {priceChangeType === 'percentage'
                              ? `${isIncrease ? "+" : ""}${parseFloat(changeValue).toFixed(2)}%`
                              : `${isIncrease ? "+" : ""}$${parseFloat(changeValue).toFixed(2)}`
                            }
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 space-y-2 bg-background">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Slider Configuration:</p>
                        
                        {product.slider_config?.pricing_brackets && (
                          <div className="pl-4 space-y-1">
                            <p className="text-xs font-medium">
                              Pricing Brackets ({product.slider_config.pricing_brackets.length}):
                            </p>
                            {product.slider_config.pricing_brackets.map((bracket, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs pl-2">
                                <span className="text-muted-foreground">
                                  Range {bracket.start}-{bracket.end}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">${bracket.price.toFixed(8)}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-medium">${calculateNewPrice(bracket.price, true).toFixed(8)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {product.slider_config?.price_per_step && (
                          <div className="pl-4 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Price per step</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                ${product.slider_config.price_per_step.toFixed(8)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">
                                ${calculateNewPrice(product.slider_config.price_per_step, true).toFixed(8)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {hasFixedPriceOptions && (
                          <>
                            <p className="text-xs font-medium text-muted-foreground mt-3 mb-2">Custom Options (fixed-price only):</p>
                            {sliderOpts.map((option) => {
                              if (option.options && Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object') {
                                const fixedPriceOptions = option.options.filter((opt: any) => 
                                  opt.priceType === 'fixed' && opt.price && parseFloat(opt.price) !== 0
                                );
                                if (fixedPriceOptions.length === 0) return null;
                                
                                return (
                                  <div key={option.id} className="pl-4 space-y-1">
                                    <p className="text-xs font-medium">{option.label}:</p>
                                    {fixedPriceOptions.map((opt: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-xs pl-2">
                                        <span className="text-muted-foreground">{opt.label || opt.value}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">${parseFloat(opt.price).toFixed(2)}</span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="font-medium">${calculateNewPrice(parseFloat(opt.price), false).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else if (option.price_modifier !== 0) {
                                return (
                                  <div key={option.id} className="pl-4 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{option.label}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">${option.price_modifier.toFixed(2)}</span>
                                      <span className="text-muted-foreground">→</span>
                                      <span className="font-medium">${calculateNewPrice(option.price_modifier, false).toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyChanges} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PriceManager;
