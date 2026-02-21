import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearAPICache } from "@/lib/adminSupabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "./RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Edit, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AIContentGenerator, GeneratedFields } from "./AIContentGenerator";

interface Category {
  id: string;
  name: string;
  game_id: string;
}

interface Game {
  id: string;
  name: string;
  slug: string;
}

interface PricingBracket {
  start: number;
  end: number;
  price: number;
}

interface DynamicOption {
  trigger_value: number;
  action: "show_option" | "apply_discount" | "unlock_feature";
  option_name?: string;
  discount_percent?: number;
  message?: string;
}

interface SingleSliderConfig {
  slider_type: "single";
  min_value: number;
  max_value: number;
  step: number;
  default_value: number;
  value_label: string;
  price_label?: string;
  price_per_step?: number;
  pricing_brackets?: PricingBracket[];
  estimated_time_per_step: number;
  dynamic_options?: DynamicOption[];
}

interface SliderProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category_id: string;
  base_price: number;
  is_active: boolean;
  is_slider_product: boolean;
  slider_config: SingleSliderConfig | null;
  image_url: string | null;
}

const SingleEndpointSliderManager = () => {
  const [products, setProducts] = useState<SliderProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SliderProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredProducts, setFilteredProducts] = useState<SliderProduct[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    how_it_works: "",
    requirements: "",
    game_id: "",
    category_id: "",
    base_price: "0",
    is_active: true,
    image_url: "",
    slider_min: "1",
    slider_max: "100",
    slider_step: "1",
    slider_default_value: "50",
    slider_value_label: "Level",
    slider_price_label: "",
    slider_price_per_step: "10",
    slider_time_per_step: "0.5",
    // SEO fields
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    canonical_url: "",
    image_alt_text: "",
  });

  const [pricingBrackets, setPricingBrackets] = useState<PricingBracket[]>([
    { start: 1, end: 10, price: 10 }
  ]);

  const [dynamicOptions, setDynamicOptions] = useState<DynamicOption[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProducts(
        products.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [products, searchQuery]);

  // Generate URL-friendly slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')  // Remove special characters
      .replace(/\s+/g, '-')       // Replace spaces with dashes
      .replace(/-+/g, '-');       // Replace multiple dashes with single
  };

  // Check if slug exists in the category
  const checkSlugExists = async (slug: string, categoryId: string, excludeId?: string): Promise<boolean> => {
    if (!categoryId) return false;
    
    let query = supabase
      .from("products")
      .select("id")
      .eq("category_id", categoryId)
      .eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };

  // Generate unique slug (add number suffix if needed)
  const generateUniqueSlug = async (baseName: string, categoryId: string, excludeId?: string): Promise<string> => {
    if (!categoryId) return generateSlug(baseName);
    
    let slug = generateSlug(baseName);
    const exists = await checkSlugExists(slug, categoryId, excludeId);

    if (exists) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      slug = `${slug}-${randomId}`;
    }

    return slug;
  };

  const normalizeSliderConfig = (rawConfig: unknown): SingleSliderConfig | null => {
    if (!rawConfig) return null;

    let config = rawConfig;
    if (typeof config === "string") {
      try {
        config = JSON.parse(config);
      } catch {
        return null;
      }
    }

    if (!config || typeof config !== "object") return null;
    return config as SingleSliderConfig;
  };

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes, gamesRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_slider_product", true)
          .order("name"),
        supabase
          .from("categories")
          .select("id, name, game_id")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("games")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (gamesRes.error) throw gamesRes.error;

      if (productsRes.data) {
        const normalizedProducts = (productsRes.data as any[]).map((p) => ({
          ...p,
          slider_config: normalizeSliderConfig(p?.slider_config),
        }));

        const singleSliderProducts = normalizedProducts.filter((p) => {
          const config = p?.slider_config;
          if (!config) return false;

          // Preferred shape: explicitly tagged single slider products.
          if (config.slider_type === "single") return true;

          // Backward compatibility: older rows may not include slider_type.
          const hasSingleShape =
            Object.prototype.hasOwnProperty.call(config, "default_value") ||
            Object.prototype.hasOwnProperty.call(config, "value_label");
          const hasMultiRangeShape =
            Object.prototype.hasOwnProperty.call(config, "default_start") ||
            Object.prototype.hasOwnProperty.call(config, "default_end");

          return hasSingleShape && !hasMultiRangeShape;
        });
        setProducts(singleSliderProducts);
      }
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (gamesRes.data) setGames(gamesRes.data);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load slider products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const sliderConfig: SingleSliderConfig = {
      slider_type: "single",
      min_value: Number(formData.slider_min),
      max_value: Number(formData.slider_max),
      step: Number(formData.slider_step),
      default_value: Number(formData.slider_default_value),
      value_label: formData.slider_value_label,
      price_label: formData.slider_price_label || undefined,
      pricing_brackets: pricingBrackets.length > 0 ? pricingBrackets : undefined,
      price_per_step: pricingBrackets.length === 0 ? Number(formData.slider_price_per_step) : undefined,
      estimated_time_per_step: Number(formData.slider_time_per_step),
      dynamic_options: dynamicOptions.length > 0 ? dynamicOptions : undefined,
    };

    const productData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      short_description: formData.short_description,
      how_it_works: formData.how_it_works || null,
      requirements: formData.requirements || null,
      category_id: formData.category_id && formData.category_id.trim() !== '' ? formData.category_id : null,
      base_price: Number(formData.base_price),
      is_active: formData.is_active,
      is_slider_product: true,
      slider_config: sliderConfig,
      image_url: formData.image_url || null,
      // SEO fields
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      og_image: formData.og_image || null,
      canonical_url: formData.canonical_url || null,
      image_alt_text: formData.image_alt_text || null,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData as any)
          .eq("id", editingProduct.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Single-endpoint slider product updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData as any]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Single-endpoint slider product created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      await clearAPICache(['/rest/v1/products']);
      await loadData();
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

  const handleEdit = (product: SliderProduct) => {
    setEditingProduct(product);
    const config = product.slider_config;
    const category = categories.find(c => c.id === product.category_id);
    const productAny = product as any;
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      short_description: product.short_description || "",
      how_it_works: productAny.how_it_works || "",
      requirements: productAny.requirements || "",
      game_id: category?.game_id || "",
      category_id: product.category_id,
      base_price: (product.base_price ?? 0).toString(),
      is_active: product.is_active,
      image_url: product.image_url || "",
      slider_min: (config?.min_value ?? 1).toString(),
      slider_max: (config?.max_value ?? 100).toString(),
      slider_step: (config?.step ?? 1).toString(),
      slider_default_value: (config?.default_value ?? 50).toString(),
      slider_value_label: config?.value_label || "Level",
      slider_price_label: config?.price_label || "",
      slider_price_per_step: (config?.price_per_step ?? 10).toString(),
      slider_time_per_step: (config?.estimated_time_per_step ?? 0.5).toString(),
      // SEO fields
      meta_title: productAny.meta_title || "",
      meta_description: productAny.meta_description || "",
      meta_keywords: productAny.meta_keywords || "",
      og_image: productAny.og_image || "",
      canonical_url: productAny.canonical_url || "",
      image_alt_text: productAny.image_alt_text || "",
    });
    setPricingBrackets(config?.pricing_brackets || [{ start: 1, end: 10, price: 10 }]);
    setDynamicOptions(config?.dynamic_options || []);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this slider product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Slider product deleted successfully",
      });
      await clearAPICache(['/rest/v1/products']);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      short_description: "",
      how_it_works: "",
      requirements: "",
      game_id: "",
      category_id: "",
      base_price: "0",
      is_active: true,
      image_url: "",
      slider_min: "1",
      slider_max: "100",
      slider_step: "1",
      slider_default_value: "50",
      slider_value_label: "Level",
      slider_price_label: "",
      slider_price_per_step: "10",
      slider_time_per_step: "0.5",
      // SEO fields
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: "",
      canonical_url: "",
      image_alt_text: "",
    });
    setPricingBrackets([{ start: 1, end: 10, price: 10 }]);
    setDynamicOptions([]);
  };

  const addBracket = () => {
    const lastBracket = pricingBrackets[pricingBrackets.length - 1];
    setPricingBrackets([
      ...pricingBrackets,
      { start: lastBracket.end + 1, end: lastBracket.end + 10, price: 10 }
    ]);
  };

  const updateBracket = (index: number, field: keyof PricingBracket, value: number) => {
    const updated = [...pricingBrackets];
    updated[index] = { ...updated[index], [field]: value };
    setPricingBrackets(updated);
  };

  const removeBracket = (index: number) => {
    if (pricingBrackets.length > 1) {
      setPricingBrackets(pricingBrackets.filter((_, i) => i !== index));
    }
  };

  const addDynamicOption = () => {
    setDynamicOptions([
      ...dynamicOptions,
      { trigger_value: 50, action: "show_option", option_name: "", message: "" }
    ]);
  };

  const updateDynamicOption = (index: number, field: keyof DynamicOption, value: any) => {
    const updated = [...dynamicOptions];
    updated[index] = { ...updated[index], [field]: value };
    setDynamicOptions(updated);
  };

  const removeDynamicOption = (index: number) => {
    setDynamicOptions(dynamicOptions.filter((_, i) => i !== index));
  };

  // Handler for AI-generated content
  const handleAIFieldsGenerated = async (fields: GeneratedFields) => {
    console.log('SingleEndpointSliderManager - handleAIFieldsGenerated called with:', fields);
    
    try {
      let currentCategoryId = '';
      let currentEditingId: string | undefined;
      
      setFormData(prev => {
        currentCategoryId = prev.category_id;
        return prev;
      });
      currentEditingId = editingProduct?.id;
      
      // Generate unique slug if provided
      let finalSlug = fields.slug || '';
      if (finalSlug && currentCategoryId) {
        try {
          finalSlug = await generateUniqueSlug(finalSlug, currentCategoryId, currentEditingId);
        } catch (slugError) {
          console.error('Error generating slug:', slugError);
          finalSlug = fields.slug || '';
        }
      }
      
      // Update form data with all generated fields
      setFormData(prev => ({
        ...prev,
        name: fields.name || prev.name,
        slug: finalSlug || prev.slug,
        short_description: fields.short_description || prev.short_description,
        description: fields.description || prev.description,
        how_it_works: fields.how_it_works || prev.how_it_works,
        requirements: fields.requirements || prev.requirements,
        meta_title: fields.meta_title || prev.meta_title,
        meta_description: fields.meta_description || prev.meta_description,
        meta_keywords: fields.meta_keywords || prev.meta_keywords,
        image_alt_text: fields.image_alt_text || prev.image_alt_text,
        base_price: fields.base_price ? fields.base_price.toString() : prev.base_price,
      }));

      // Handle slider config if provided (single slider specific)
      if (fields.slider_config) {
        const sc = fields.slider_config;
        setFormData(prev => ({
          ...prev,
          slider_min: sc.min_value?.toString() || prev.slider_min,
          slider_max: sc.max_value?.toString() || prev.slider_max,
          slider_step: sc.step?.toString() || prev.slider_step,
          slider_default_value: sc.default_value?.toString() || prev.slider_default_value,
          slider_value_label: sc.value_label || prev.slider_value_label,
          slider_price_per_step: sc.price_per_step?.toString() || prev.slider_price_per_step,
          slider_time_per_step: sc.estimated_time_per_step?.toString() || prev.slider_time_per_step,
        }));
      }
      
      console.log('SingleEndpointSliderManager - Form data updated successfully');
    } catch (error) {
      console.error('Error in handleAIFieldsGenerated:', error);
      toast({
        title: "Error",
        description: "Failed to populate form fields. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Single-Endpoint Slider Products</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Single Slider Product
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-4xl max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Single-Endpoint Slider Product" : "Create Single-Endpoint Slider Product"}
                </DialogTitle>
              </DialogHeader>

              {/* AI Content Generator */}
              <AIContentGenerator
                gameId={formData.game_id}
                categoryId={formData.category_id}
                gameName={games.find(g => g.id === formData.game_id)?.name}
                categoryName={categories.find(c => c.id === formData.category_id)?.name}
                productType="single_slider"
                onFieldsGenerated={handleAIFieldsGenerated}
                isEditMode={!!editingProduct}
                existingProduct={editingProduct ? {
                  name: editingProduct.name,
                  slug: editingProduct.slug,
                  base_price: (editingProduct.base_price ?? 0).toString(),
                } : undefined}
              />

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={async (e) => {
                      const newName = e.target.value;
                      setFormData({ ...formData, name: newName });
                      
                      // Auto-generate slug ONLY if:
                      // 1. We're creating a new product (not editing)
                      // 2. OR the slug field is currently empty
                      if ((!editingProduct || formData.slug === '') && formData.category_id) {
                        const autoSlug = await generateUniqueSlug(newName, formData.category_id);
                        setFormData(prev => ({ ...prev, name: newName, slug: autoSlug }));
                      }
                    }}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        required
                        placeholder="auto-generated-from-name"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (formData.name && formData.category_id) {
                          const newSlug = await generateUniqueSlug(
                            formData.name, 
                            formData.category_id,
                            editingProduct?.id
                          );
                          setFormData({ ...formData, slug: newSlug });
                          toast({
                            title: "Slug Generated",
                            description: `New slug: ${newSlug}`,
                          });
                        }
                      }}
                      disabled={!formData.name || !formData.category_id}
                    >
                      Generate from Name
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="game">Game *</Label>
                  <Select
                    value={formData.game_id}
                    onValueChange={(value) => setFormData({ ...formData, game_id: value, category_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select game" />
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

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    disabled={!formData.game_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.game_id ? "Select category" : "Select a game first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(cat => cat.game_id === formData.game_id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Full Description</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                    placeholder="Full product description with formatting"
                    rows={6}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="how_it_works">How It Works</Label>
                  <RichTextEditor
                    value={formData.how_it_works}
                    onChange={(value) => setFormData((prev) => ({ ...prev, how_it_works: value }))}
                    placeholder="Step-by-step guide with formatting"
                    rows={6}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <RichTextEditor
                    value={formData.requirements}
                    onChange={(value) => setFormData((prev) => ({ ...prev, requirements: value }))}
                    placeholder="What customers need"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="base_price">Base Price *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="any"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Single Slider Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="slider_min">Minimum Value *</Label>
                    <Input
                      id="slider_min"
                      type="number"
                      value={formData.slider_min}
                      onChange={(e) => setFormData({ ...formData, slider_min: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slider_max">Maximum Value *</Label>
                    <Input
                      id="slider_max"
                      type="number"
                      value={formData.slider_max}
                      onChange={(e) => setFormData({ ...formData, slider_max: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slider_step">Step Size *</Label>
                    <Input
                      id="slider_step"
                      type="number"
                      step="0.01"
                      value={formData.slider_step}
                      onChange={(e) => setFormData({ ...formData, slider_step: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slider_default_value">Default Value *</Label>
                    <Input
                      id="slider_default_value"
                      type="number"
                      value={formData.slider_default_value}
                      onChange={(e) => setFormData({ ...formData, slider_default_value: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slider_value_label">Value Label *</Label>
                    <Input
                      id="slider_value_label"
                      value={formData.slider_value_label}
                      onChange={(e) => setFormData({ ...formData, slider_value_label: e.target.value })}
                      required
                      placeholder="e.g., Level, Amount, Quantity"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slider_price_label">Price Label (Optional)</Label>
                    <Input
                      id="slider_price_label"
                      value={formData.slider_price_label}
                      onChange={(e) => setFormData({ ...formData, slider_price_label: e.target.value })}
                      placeholder="e.g., Runs, Items, Units (leave empty for default)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If empty, will show "{formData.slider_value_label} Price"
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="slider_time_per_step">Time per Step (days) *</Label>
                    <Input
                      id="slider_time_per_step"
                      type="number"
                      step="0.1"
                      value={formData.slider_time_per_step}
                      onChange={(e) => setFormData({ ...formData, slider_time_per_step: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-base font-semibold mb-3 block">Pricing Brackets</Label>
                    <div className="space-y-3 mb-3">
                      {pricingBrackets.map((bracket, index) => (
                        <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                          <div className="flex-1">
                            <Label htmlFor={`bracket_start_${index}`} className="text-xs">Start Level</Label>
                            <Input
                              id={`bracket_start_${index}`}
                              type="number"
                              value={bracket.start}
                              onChange={(e) => updateBracket(index, 'start', Number(e.target.value))}
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`bracket_end_${index}`} className="text-xs">End Level</Label>
                            <Input
                              id={`bracket_end_${index}`}
                              type="number"
                              value={bracket.end}
                              onChange={(e) => updateBracket(index, 'end', Number(e.target.value))}
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`bracket_price_${index}`} className="text-xs">Price ($)</Label>
                            <Input
                              id={`bracket_price_${index}`}
                              type="number"
                              step="any"
                              value={bracket.price}
                              onChange={(e) => updateBracket(index, 'price', Number(e.target.value))}
                              required
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeBracket(index)}
                            disabled={pricingBrackets.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={addBracket} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Bracket
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Dynamic Options & Events</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure options that appear or discounts that apply when the slider reaches specific values
                </p>
                
                {dynamicOptions.length > 0 && (
                  <div className="space-y-3 mb-3">
                    {dynamicOptions.map((option, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Trigger at Value</Label>
                            <Input
                              type="number"
                              value={option.trigger_value}
                              onChange={(e) => updateDynamicOption(index, 'trigger_value', Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Action Type</Label>
                            <Select
                              value={option.action}
                              onValueChange={(value: any) => updateDynamicOption(index, 'action', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="show_option">Show Option</SelectItem>
                                <SelectItem value="apply_discount">Apply Discount</SelectItem>
                                <SelectItem value="unlock_feature">Unlock Feature</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeDynamicOption(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {option.action === "show_option" && (
                          <div>
                            <Label className="text-xs">Option Name (must match product option)</Label>
                            <Input
                              value={option.option_name || ""}
                              onChange={(e) => updateDynamicOption(index, 'option_name', e.target.value)}
                              placeholder="e.g., express_delivery"
                            />
                          </div>
                        )}

                        {option.action === "apply_discount" && (
                          <div>
                            <Label className="text-xs">Discount Percentage</Label>
                            <Input
                              type="number"
                              step="1"
                              value={option.discount_percent || 0}
                              onChange={(e) => updateDynamicOption(index, 'discount_percent', Number(e.target.value))}
                              placeholder="e.g., 10"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="text-xs">Display Message</Label>
                          <Input
                            value={option.message || ""}
                            onChange={(e) => updateDynamicOption(index, 'message', e.target.value)}
                            placeholder="e.g., Express delivery now available!"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button type="button" variant="outline" onClick={addDynamicOption} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Dynamic Option
                </Button>
              </div>

              {/* SEO Settings Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">SEO Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Optimize this product for search engines. These fields help Google understand and rank your product.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      placeholder="Custom SEO title (leave empty to auto-generate)"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.meta_title.length}/60 characters • Recommended: 50-60 characters
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="meta_description">Meta Description (max 160 chars)</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value.slice(0, 160) })}
                      placeholder="Brief description for search results..."
                      rows={2}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="meta_keywords">Meta Keywords</Label>
                    <Input
                      id="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated keywords for this product
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="og_image">OG Image URL</Label>
                    <Input
                      id="og_image"
                      value={formData.og_image}
                      onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Image shown when shared on social media (1200x630px recommended)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="image_alt_text">Image Alt Text</Label>
                    <Input
                      id="image_alt_text"
                      value={formData.image_alt_text}
                      onChange={(e) => setFormData({ ...formData, image_alt_text: e.target.value })}
                      placeholder="Descriptive text for the product image"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="canonical_url">Canonical URL (optional)</Label>
                    <Input
                      id="canonical_url"
                      value={formData.canonical_url}
                      onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                      placeholder="https://misti.services/game/..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only set if this product has a preferred URL different from default
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProduct ? "Update" : "Create"} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search single slider products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Dynamic Options</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No single slider products match your search
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No single-endpoint slider products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {categories.find(c => c.id === product.category_id)?.name}
                  </TableCell>
                  <TableCell>
                    {product.slider_config?.min_value} - {product.slider_config?.max_value}
                  </TableCell>
                  <TableCell>
                    {product.slider_config?.dynamic_options?.length || 0} events
                  </TableCell>
                  <TableCell>
                    {product.is_active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SingleEndpointSliderManager;
