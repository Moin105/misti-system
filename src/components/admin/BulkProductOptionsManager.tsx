import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { getErrorMessage } from "@/lib/errorHandler";

type OptionType = "select" | "button_group" | "checkbox" | "text" | "number";
type PriceModifierType = "fixed" | "percentage";
type ProductType = "normal" | "range_slider" | "single_slider";

interface ProductInfo {
  id: string;
  name: string;
  category_name: string;
  game_name: string;
  options_count: number;
  product_type: ProductType;
  created_at: string | null;
  updated_at: string | null;
}

interface OptionChoice {
  label: string;
  value: string;
  price: number;
  priceType: PriceModifierType;
}

interface OptionTemplate {
  name: string;
  label: string;
  option_type: OptionType;
  is_required: boolean;
  sort_order: number;
  choices: OptionChoice[];
  price_modifier?: number;
  price_modifier_type?: PriceModifierType;
  percentage_applies_to_cumulative: boolean;
  default_value?: string;
  min_value?: number;
  max_value?: number;
}

const BulkProductOptionsManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  
  const [template, setTemplate] = useState<OptionTemplate>({
    name: "",
    label: "",
    option_type: "select",
    is_required: false,
    sort_order: 0,
    choices: [{ label: "", value: "", price: 0, priceType: "fixed" }],
    percentage_applies_to_cumulative: false,
    price_modifier: 0,
    price_modifier_type: "fixed",
  });

  const queryClient = useQueryClient();

  // Fetch products (including sliders)
  const { data: products, isLoading } = useQuery({
    queryKey: ["bulk-products-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, slug, category_id, is_slider_product, slider_config, created_at, updated_at,
          categories!inner(name, game_id, games!inner(name)),
          product_options(id)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => {
        let productType: ProductType = "normal";
        if (p.is_slider_product && p.slider_config) {
          const config = p.slider_config as any;
          productType = config.is_single_endpoint ? "single_slider" : "range_slider";
        }
        
        return {
          id: p.id,
          name: p.name,
          category_name: p.categories.name,
          game_name: p.categories.games.name,
          options_count: p.product_options?.length || 0,
          product_type: productType,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      }) as ProductInfo[];
    },
  });

  // Fetch games for filter
  const { data: games } = useQuery({
    queryKey: ["games-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ["categories-filter", gameFilter],
    queryFn: async () => {
      let query = supabase
        .from("categories")
        .select("id, name, game_id, games!inner(name)")
        .eq("is_active", true)
        .order("name");
      
      if (gameFilter !== "all") {
        const selectedGame = games?.find(g => g.name === gameFilter);
        if (selectedGame) {
          query = query.eq("game_id", selectedGame.id);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!games,
  });

  // Bulk insert mutation
  const applyBulkOptions = useMutation({
    mutationFn: async () => {
      const optionRecords = Array.from(selectedProducts).map((productId) => ({
        product_id: productId,
        name: template.name,
        label: template.label,
        option_type: template.option_type,
        is_required: template.is_required,
        sort_order: template.sort_order,
        percentage_applies_to_cumulative: template.percentage_applies_to_cumulative,
        default_value: template.default_value,
        min_value: template.min_value,
        max_value: template.max_value,
        price_modifier: template.price_modifier ?? 0,
        price_modifier_type: template.price_modifier_type ?? "fixed",
        options: ["select", "button_group", "checkbox"].includes(template.option_type)
          ? template.choices.map((c) => ({
              label: c.label,
              value: c.value || c.label.toLowerCase().replace(/\s+/g, "_"),
              price: c.price,
              priceType: c.priceType,
            }))
          : null,
      }));

      const { data, error } = await supabase
        .from("product_options")
        .insert(optionRecords)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully applied option to ${data.length} products!`);
      queryClient.invalidateQueries({ queryKey: ["bulk-products"] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
    setSelectedProducts(new Set());
    setSearchTerm("");
    setGameFilter("all");
    setCategoryFilter("all");
    setProductTypeFilter("all");
    setSortBy("name");
    setTemplate({
      name: "",
      label: "",
      option_type: "select",
      is_required: false,
      sort_order: 0,
      choices: [{ label: "", value: "", price: 0, priceType: "fixed" }],
      percentage_applies_to_cumulative: false,
      price_modifier: 0,
      price_modifier_type: "fixed",
    });
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const addChoice = () => {
    setTemplate({
      ...template,
      choices: [...template.choices, { label: "", value: "", price: 0, priceType: "fixed" }],
    });
  };

  const removeChoice = (index: number) => {
    const newChoices = template.choices.filter((_, i) => i !== index);
    setTemplate({ ...template, choices: newChoices });
  };

  const updateChoice = (index: number, field: keyof OptionChoice, value: any) => {
    const newChoices = [...template.choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    setTemplate({ ...template, choices: newChoices });
  };

  const validateStep1 = () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!template.label.trim()) {
      toast.error("Option label is required");
      return false;
    }
    if (!template.name.trim()) {
      toast.error("Option name is required");
      return false;
    }
    if (["select", "button_group", "checkbox"].includes(template.option_type)) {
      if (template.choices.length === 0) {
        toast.error("At least one choice is required");
        return false;
      }
      if (template.choices.some((c) => !c.label.trim())) {
        toast.error("All choices must have labels");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
    }
  };

  const filteredProducts = products
    ?.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGame = gameFilter === "all" || p.game_name === gameFilter;
      const matchesCategory = categoryFilter === "all" || p.category_name === categoryFilter;
      const matchesType = productTypeFilter === "all" || p.product_type === productTypeFilter;
      return matchesSearch && matchesGame && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      const getSortTimestamp = (product: ProductInfo) => {
        const primary = product.created_at ? new Date(product.created_at).getTime() : 0;
        const fallback = product.updated_at ? new Date(product.updated_at).getTime() : 0;
        return Number.isFinite(primary) && primary > 0 ? primary : fallback;
      };

      switch (sortBy) {
        case "latest":
          return getSortTimestamp(b) - getSortTimestamp(a);
        case "missing_options":
          if (a.options_count === 0 && b.options_count > 0) return -1;
          if (a.options_count > 0 && b.options_count === 0) return 1;
          return a.name.localeCompare(b.name);
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getProductTypeBadge = (type: ProductType) => {
    switch (type) {
      case "normal":
        return <span className="px-2 py-0.5 text-xs bg-muted rounded">Normal</span>;
      case "range_slider":
        return <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">Range Slider</span>;
      case "single_slider":
        return <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">Single Slider</span>;
    }
  };

  const handleLabelChange = (value: string) => {
    setTemplate({
      ...template,
      label: value,
      name: template.name || value.toLowerCase().replace(/\s+/g, "_"),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk Product Options</h2>
          <p className="text-muted-foreground">Apply custom options to multiple products at once</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Bulk Options
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bulk Add Options - Step {step} of 3
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Select products to apply the option to"}
              {step === 2 && "Configure the option template"}
              {step === 3 && "Review and confirm"}
            </DialogDescription>
          </DialogHeader>

          {/* Navigation buttons at top */}
          <div className="flex justify-between items-center py-3 border-b mb-4">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button onClick={handleBack} variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <p className="text-sm text-muted-foreground">
                {step === 1 && `Selected: ${selectedProducts.size} products`}
                {step === 2 && `${selectedProducts.size} products selected`}
                {step === 3 && `Ready to apply to ${selectedProducts.size} products`}
              </p>
            </div>
            {step === 1 && (
              <Button onClick={handleNext} disabled={selectedProducts.size === 0} size="sm">
                Next Step <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleNext} size="sm">
                Preview & Apply <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={() => applyBulkOptions.mutate()}
                disabled={applyBulkOptions.isPending}
                size="sm"
              >
                {applyBulkOptions.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Apply to All
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Step 1: Product Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Filter Bar - Row 1: Search + Sort */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="latest">Latest Added</SelectItem>
                    <SelectItem value="missing_options">Missing Options First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Bar - Row 2: Game, Category, Type filters */}
              <div className="grid grid-cols-3 gap-3">
                <Select value={gameFilter} onValueChange={(value) => {
                  setGameFilter(value);
                  setCategoryFilter("all");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by game" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">All Games</SelectItem>
                    {games?.map((game) => (
                      <SelectItem key={game.id} value={game.name}>
                        {game.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="range_slider">Range Slider</SelectItem>
                    <SelectItem value="single_slider">Single Slider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Select</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead className="text-right">Options</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts?.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProducts.has(product.id)}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{getProductTypeBadge(product.product_type)}</TableCell>
                          <TableCell>{product.category_name}</TableCell>
                          <TableCell>{product.game_name}</TableCell>
                          <TableCell className="text-right">
                            {product.options_count === 0 ? (
                              <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                                None
                              </span>
                            ) : (
                              product.options_count
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

            </div>
          )}

          {/* Step 2: Option Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Option Type</Label>
                  <p className="text-xs text-muted-foreground">
                    How customers will select this option on the product page
                  </p>
                  <Select
                    value={template.option_type}
                    onValueChange={(value: OptionType) =>
                      setTemplate({ ...template, option_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="button_group">Button Group</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="number">Number Input</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Display Label *</Label>
                  <p className="text-xs text-muted-foreground">
                    Visible to customers (e.g., "Server Selection", "Realm Choice")
                  </p>
                  <Input
                    placeholder="e.g., Server Selection"
                    value={template.label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Internal Name *</Label>
                  <p className="text-xs text-muted-foreground">
                    Used in database (e.g., "server", "realm") - auto-filled from label
                  </p>
                  <Input
                    placeholder="e.g., server"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first (0 = top, 10 = bottom)
                  </p>
                  <Input
                    type="number"
                    value={template.sort_order}
                    onChange={(e) =>
                      setTemplate({ ...template, sort_order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={template.is_required}
                    onCheckedChange={(checked) =>
                      setTemplate({ ...template, is_required: checked })
                    }
                  />
                  <Label>Required Field</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-11">
                  If enabled, customers must select this option before checkout
                </p>
              </div>

              {["select", "button_group", "checkbox"].includes(template.option_type) && (
                <div className="space-y-2">
                  <Label>Choices</Label>
                  <p className="text-xs text-muted-foreground">
                    Add the options customers can select. Set price as fixed ($10) or percentage (10%)
                  </p>
                  <div className="space-y-2">
                    {template.choices.map((choice, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Choice label"
                          value={choice.label}
                          onChange={(e) => updateChoice(index, "label", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={choice.price}
                          onChange={(e) =>
                            updateChoice(index, "price", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                        <Select
                          value={choice.priceType}
                          onValueChange={(value: PriceModifierType) =>
                            updateChoice(index, "priceType", value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            <SelectItem value="fixed">Fixed</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeChoice(index)}
                          disabled={template.choices.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button onClick={addChoice} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Choice
                  </Button>
                </div>
              )}

              {["text", "number"].includes(template.option_type) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price Modifier (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Additional cost per unit entered by customer
                    </p>
                    <Input
                      type="number"
                      placeholder="0"
                      value={template.price_modifier ?? 0}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          price_modifier: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Type</Label>
                    <p className="text-xs text-muted-foreground">
                      Fixed ($10) or percentage (10% of base price)
                    </p>
                    <Select
                      value={template.price_modifier_type || "fixed"}
                      onValueChange={(value: PriceModifierType) =>
                        setTemplate({ ...template, price_modifier_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {template.option_type === "number" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Value (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Minimum number customers can enter
                    </p>
                    <Input
                      type="number"
                      placeholder="No minimum"
                      value={template.min_value || ""}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          min_value: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Value (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Maximum number customers can enter
                    </p>
                    <Input
                      type="number"
                      placeholder="No maximum"
                      value={template.max_value || ""}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          max_value: parseInt(e.target.value) || undefined,
                        })
                      }
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Step 3: Preview & Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">
                    Ready to apply "{template.label}" to {selectedProducts.size} products
                  </h3>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Option Details:</p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      <li>• Type: {template.option_type}</li>
                      <li>• Required: {template.is_required ? "Yes" : "No"}</li>
                      <li>• Sort Order: {template.sort_order}</li>
                      {["select", "button_group", "checkbox"].includes(template.option_type) && (
                        <li>
                          • Choices:{" "}
                          {template.choices
                            .map(
                              (c) =>
                                `${c.label} (${c.priceType === "percentage" ? c.price + "%" : "$" + c.price})`
                            )
                            .join(", ")}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Selected Products:</p>
                  <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                    {Array.from(selectedProducts).map((id) => {
                      const product = products?.find((p) => p.id === id);
                      return (
                        <div key={id}>
                          • {product?.name} ({product?.game_name} - {product?.category_name})
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkProductOptionsManager;
