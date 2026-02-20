import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Trash2, Upload, Plus, X, Search, MessageSquare, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "./RichTextEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOPreview } from "./SEOPreview";
import { BulkSEOGenerator } from "./BulkSEOGenerator";
import { BulkMetaTitleGenerator } from "./BulkMetaTitleGenerator";
import { AIContentGenerator, GeneratedFields } from "./AIContentGenerator";
import { InlineRewardsGenerator } from "./InlineRewardsGenerator";
import { InlineFAQGenerator } from "./InlineFAQGenerator";
import { InternalLinkBrowser } from "./InternalLinkBrowser";


interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  label: string;
  option_type: 'select' | 'checkbox' | 'number' | 'text' | 'button_group';
  options: any;
  is_required: boolean;
  default_value: string | null;
  price_modifier: number;
  price_modifier_type: string;
  percentage_applies_to_cumulative: boolean;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  image_url: string | null;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_manually_popular?: boolean;
  total_sales?: number;
  sort_order: number;
  badge_text: string | null;
  trust_score: number;
  total_reviews: number;
  how_it_works: string | null;
  requirements: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  image_alt_text?: string | null;
  og_image?: string | null;
}

interface Game {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  game_id: string;
}

const ProductsManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productsNeedingSEO, setProductsNeedingSEO] = useState(0);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [selectOptions, setSelectOptions] = useState<Array<{label: string, price: string, priceType: string}>>([{label: '', price: '0', priceType: 'fixed'}]);
  
  // Filter and pagination states
  const [filterGameId, setFilterGameId] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterFeatured, setFilterFeatured] = useState<string>("all");
  const [filterPopular, setFilterPopular] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest"); // newest, oldest, sort_order, missing_seo
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const ITEMS_PER_PAGE = 50;
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    base_price: "0",
    category_id: "",
    badge_text: "",
    trust_score: "4.9",
    total_reviews: "0",
    is_active: true,
    is_featured: false,
    is_manually_popular: false,
    sort_order: 0,
    image_url: "",
    how_it_works: "",
    requirements: "",
    start_time_text: "15 minutes",
    start_time_value: "average start time",
    delivery_text: "Flexible",
    delivery_value: "order completion",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    canonical_url: "",
    image_alt_text: "",
    parent_link: "",
  });

  const [optionFormData, setOptionFormData] = useState({
    name: "",
    label: "",
    option_type: "select" as 'select' | 'checkbox' | 'number' | 'text' | 'button_group',
    is_required: false,
    price_modifier: "0",
    price_modifier_type: "fixed" as 'fixed' | 'percentage',
    percentage_applies_to_cumulative: false,
    min_value: "",
    max_value: "",
    default_value: "",
    sort_order: 0,
  });

  const fetchSEOCount = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, meta_description, meta_keywords, image_alt_text");
    
    if (error) {
      console.error("Failed to fetch SEO count:", error);
      return;
    }

    const needingSEO = data?.filter(p => 
      !p.meta_description || 
      !p.meta_keywords || 
      !p.image_alt_text
    ).length || 0;
    
    setProductsNeedingSEO(needingSEO);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const gamesPromise = fetchGames();
      const categoriesPromise = fetchAllCategories();
      await Promise.all([gamesPromise, categoriesPromise]);
      await fetchProducts();
      await fetchSEOCount();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      fetchCategories(selectedGameId);
    } else {
      setCategories([]);
    }
  }, [selectedGameId]);

  useEffect(() => {
    if (filterGameId && filterGameId !== "all") {
      fetchCategories(filterGameId);
    } else {
      setCategories([]);
    }
  }, [filterGameId]);

  useEffect(() => {
    // Fetch products when filters or sorting change
    setCurrentPage(1); // Reset to first page when filters change
  }, [filterGameId, filterCategoryId, filterActive, filterFeatured, filterPopular, sortBy, searchQuery]);

  useEffect(() => {
    // Fetch products when page changes
    fetchProducts();
  }, [currentPage, filterGameId, filterCategoryId, filterActive, filterFeatured, filterPopular, sortBy, searchQuery]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("sort_order");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
      return;
    }

    setGames(data || []);
  };

  const fetchAllCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch all categories",
        variant: "destructive",
      });
      return;
    }

    setAllCategories(data || []);
  };

  const fetchCategories = async (gameId: string) => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", gameId)
      .order("sort_order");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
      return;
    }

    setCategories(data || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    
    // Build query for fetching products
    let query = supabase
      .from("products")
      .select("*");
    
    // Apply sorting
    switch (sortBy) {
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "missing_seo":
        // We'll sort this client-side after fetching
        query = query.order("sort_order");
        break;
      default:
        query = query.order("sort_order");
    }
    
    if (filterCategoryId && filterCategoryId !== "all") {
      query = query.eq("category_id", filterCategoryId);
    }
    
    if (filterActive !== "all") {
      query = query.eq("is_active", filterActive === "true");
    }
    
    if (filterFeatured !== "all") {
      query = query.eq("is_featured", filterFeatured === "true");
    }
    
    if (filterPopular !== "all") {
      query = query.eq("is_manually_popular", filterPopular === "true");
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    let filteredProducts = data || [];

    // Apply game filter client-side if needed
    if (filterGameId && filterGameId !== "all" && filteredProducts.length > 0) {
      const categoryIds = allCategories
        .filter(cat => cat.game_id === filterGameId)
        .map(cat => cat.id);
      
      filteredProducts = filteredProducts.filter(product => 
        categoryIds.includes(product.category_id)
      );
    }

    // Apply search filter client-side
    if (searchQuery.trim()) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by missing SEO if selected
    if (sortBy === "missing_seo") {
      filteredProducts.sort((a, b) => {
        const aScore = (!a.meta_description ? 1 : 0) + (!a.meta_keywords ? 1 : 0) + (!a.image_alt_text ? 1 : 0);
        const bScore = (!b.meta_description ? 1 : 0) + (!b.meta_keywords ? 1 : 0) + (!b.image_alt_text ? 1 : 0);
        return bScore - aScore; // Sort by most missing first
      });
    }

    // Calculate pagination
    const totalCount = filteredProducts.length;
    setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
    
    // Apply pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    setProducts(paginatedProducts);
    setLoading(false);
  };

  const resetFilters = () => {
    setFilterGameId("all");
    setFilterCategoryId("all");
    setFilterActive("all");
    setFilterFeatured("all");
    setFilterPopular("all");
    setSortBy("sort_order");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from("game-images")
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("game-images").getPublicUrl(filePath);

    setFormData({ ...formData, image_url: publicUrl });
    setUploading(false);

    toast({
      title: "Success",
      description: "Image uploaded successfully",
    });
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const checkSlugExists = async (
    slug: string,
    categoryId: string,
    excludeId?: string
  ): Promise<boolean> => {
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

  const generateUniqueSlug = async (
    baseName: string,
    categoryId: string,
    excludeId?: string
  ): Promise<string> => {
    let slug = generateSlug(baseName);
    const exists = await checkSlugExists(slug, categoryId, excludeId);

    if (exists) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      slug = `${slug}-${randomId}`;
    }

    return slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category_id) {
      toast({
        title: "Error",
        description: "Name and category are required",
        variant: "destructive",
      });
      return;
    }

    // Only generate new slug if creating new product OR slug is empty
    let slug = formData.slug;
    if (!editingProduct || !slug) {
      slug = await generateUniqueSlug(
        formData.name,
        formData.category_id,
        editingProduct?.id
      );
    }

    const productData = {
      name: formData.name,
      slug: slug,
      short_description: formData.short_description || null,
      description: formData.description || null,
      base_price: parseFloat(formData.base_price),
      category_id: formData.category_id,
      badge_text: formData.badge_text || null,
      trust_score: parseFloat(formData.trust_score),
      total_reviews: parseInt(formData.total_reviews),
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      is_manually_popular: formData.is_manually_popular,
      sort_order: formData.sort_order,
      image_url: formData.image_url || null,
      how_it_works: formData.how_it_works || null,
      requirements: formData.requirements || null,
      start_time_text: formData.start_time_text,
      start_time_value: formData.start_time_value,
      delivery_text: formData.delivery_text,
      delivery_value: formData.delivery_value,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      og_image: formData.og_image || null,
      canonical_url: formData.canonical_url || null,
      image_alt_text: formData.image_alt_text || null,
      parent_link: formData.parent_link || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } else {
      const { data, error } = await supabase.from("products").insert(productData).select();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create product",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Product created successfully. You can now add options.",
      });
      
      // Keep dialog open and switch to edit mode for newly created product
      if (data && data[0]) {
        setEditingProduct(data[0] as Product);
        await fetchProductOptions(data[0].id);
        return;
      }
    }

    setDialogOpen(false);
    resetForm();
    await refreshAdminData(['/rest/v1/products', '/rest/v1/product_options'], ['products', 'product_options']);
    await fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Product deleted successfully",
    });

    await refreshAdminData(['/rest/v1/products'], ['products']);
    await fetchProducts();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      short_description: "",
      description: "",
      base_price: "0",
      category_id: "",
      badge_text: "",
      trust_score: "4.9",
      total_reviews: "0",
      is_active: true,
      is_featured: false,
      is_manually_popular: false,
      sort_order: 0,
      image_url: "",
      how_it_works: "",
      requirements: "",
      start_time_text: "15 minutes",
      start_time_value: "average start time",
      delivery_text: "Flexible",
      delivery_value: "order completion",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: "",
      canonical_url: "",
      image_alt_text: "",
      parent_link: "",
    });
    setEditingProduct(null);
    setSelectedGameId("");
  };

  const fetchProductOptions = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");

    if (!error && data) {
      setProductOptions(data);
    }
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      short_description: product.short_description || "",
      description: product.description || "",
      base_price: (product.base_price ?? 0).toString(),
      category_id: product.category_id,
      badge_text: product.badge_text || "",
      trust_score: (product.trust_score ?? 0).toString(),
      total_reviews: (product.total_reviews ?? 0).toString(),
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_manually_popular: (product as any).is_manually_popular || false,
      sort_order: product.sort_order,
      image_url: product.image_url || "",
      how_it_works: product.how_it_works || "",
      requirements: product.requirements || "",
      start_time_text: (product as any).start_time_text || "15 minutes",
      start_time_value: (product as any).start_time_value || "average start time",
      delivery_text: (product as any).delivery_text || "Flexible",
      delivery_value: (product as any).delivery_value || "order completion",
      meta_title: (product as any).meta_title || "",
      meta_description: (product as any).meta_description || "",
      meta_keywords: (product as any).meta_keywords || "",
      og_image: (product as any).og_image || "",
      canonical_url: (product as any).canonical_url || "",
      image_alt_text: (product as any).image_alt_text || "",
      parent_link: (product as any).parent_link || "",
    });

    // Fetch the game from category
    const { data: category } = await supabase
      .from("categories")
      .select("id, game_id")
      .eq("id", product.category_id)
      .single();

    if (category) {
      setSelectedGameId(category.game_id);
    }

    // Fetch product options
    await fetchProductOptions(product.id);

    setDialogOpen(true);
  };

  const handleAddOption = () => {
    if (!editingProduct) {
      toast({
        title: "Error",
        description: "Please save the product first before adding options",
        variant: "destructive",
      });
      return;
    }
    setEditingOption(null);
    setOptionFormData({
      name: "",
      label: "",
      option_type: "select",
      is_required: false,
      price_modifier: "0",
      price_modifier_type: "fixed",
      percentage_applies_to_cumulative: false,
      min_value: "",
      max_value: "",
      default_value: "",
      sort_order: productOptions.length,
    });
    setSelectOptions([{label: '', price: '0', priceType: 'fixed'}]);
    setOptionDialogOpen(true);
  };

  const handleEditOption = (option: ProductOption) => {
    setEditingOption(option);
    setOptionFormData({
      name: option.name,
      label: option.label,
      option_type: option.option_type,
      is_required: option.is_required,
      price_modifier: (option.price_modifier ?? 0).toString(),
      price_modifier_type: (option.price_modifier_type ?? "fixed") as 'fixed' | 'percentage',
      percentage_applies_to_cumulative: option.percentage_applies_to_cumulative || false,
      min_value: option.min_value?.toString() || "",
      max_value: option.max_value?.toString() || "",
      default_value: option.default_value || "",
      sort_order: option.sort_order,
    });
    if ((option.option_type === 'select' || option.option_type === 'button_group' || option.option_type === 'checkbox') && option.options) {
      const opts = option.options as any;
      if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'object') {
        setSelectOptions(opts);
      } else if (Array.isArray(opts)) {
        // Convert old format to new format
        setSelectOptions(opts.map(o => ({label: o, price: '0', priceType: 'fixed'})));
      } else {
        setSelectOptions([{label: '', price: '0', priceType: 'fixed'}]);
      }
    } else {
      setSelectOptions([{label: '', price: '0', priceType: 'fixed'}]);
    }
    setOptionDialogOpen(true);
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm("Are you sure you want to delete this option?")) return;

    const { error } = await supabase
      .from("product_options")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete option",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Option deleted successfully",
    });

    if (editingProduct) {
      await refreshAdminData(['/rest/v1/product_options'], ['product_options']);
      await fetchProductOptions(editingProduct.id);
    }
  };

  const handleSubmitOption = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProduct) return;

    if (!optionFormData.name || !optionFormData.label) {
      toast({
        title: "Error",
        description: "Name and label are required",
        variant: "destructive",
      });
      return;
    }

    let optionsData = null;
    if (optionFormData.option_type === 'select' || optionFormData.option_type === 'button_group' || optionFormData.option_type === 'checkbox') {
      optionsData = selectOptions.filter(opt => opt.label.trim() !== '');
      if (optionsData.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one option",
          variant: "destructive",
        });
        return;
      }
    }

    const optionData = {
      product_id: editingProduct.id,
      name: optionFormData.name,
      label: optionFormData.label,
      option_type: optionFormData.option_type,
      options: optionsData,
      is_required: optionFormData.is_required,
      default_value: optionFormData.default_value || null,
      price_modifier: parseFloat(optionFormData.price_modifier),
      price_modifier_type: optionFormData.price_modifier_type,
      percentage_applies_to_cumulative: optionFormData.percentage_applies_to_cumulative,
      min_value: optionFormData.min_value ? parseInt(optionFormData.min_value) : null,
      max_value: optionFormData.max_value ? parseInt(optionFormData.max_value) : null,
      sort_order: optionFormData.sort_order,
    };

    if (editingOption) {
      const { error } = await supabase
        .from("product_options")
        .update(optionData)
        .eq("id", editingOption.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update option",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Option updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("product_options")
        .insert(optionData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create option",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Option created successfully",
      });
    }

    setOptionDialogOpen(false);
    await refreshAdminData(['/rest/v1/product_options'], ['product_options']);
    await fetchProductOptions(editingProduct.id);
  };

  // Handler for AI-generated content
  const handleAIFieldsGenerated = async (fields: GeneratedFields) => {
    console.log('ProductsManager - handleAIFieldsGenerated called with:', fields);
    
    try {
      // Get current category_id from state via functional update pattern
      let currentCategoryId = '';
      let currentEditingId: string | undefined;
      
      // Read current values synchronously
      setFormData(prev => {
        currentCategoryId = prev.category_id;
        return prev; // Return unchanged - just reading
      });
      currentEditingId = editingProduct?.id;
      
      console.log('ProductsManager - Current category_id:', currentCategoryId);
      
      // Generate unique slug if provided
      let finalSlug = fields.slug || '';
      if (finalSlug && currentCategoryId) {
        try {
          finalSlug = await generateUniqueSlug(finalSlug, currentCategoryId, currentEditingId);
          console.log('ProductsManager - Generated unique slug:', finalSlug);
        } catch (slugError) {
          console.error('ProductsManager - Error generating slug:', slugError);
          // Continue with original slug if generation fails
          finalSlug = fields.slug || '';
        }
      }
      
      // Update form data with all generated fields
      setFormData(prev => {
        const newFormData = {
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
        };
        console.log('ProductsManager - Updating form data to:', newFormData);
        return newFormData;
      });
      
      console.log('ProductsManager - Form data updated successfully');
    } catch (error) {
      console.error('ProductsManager - Error in handleAIFieldsGenerated:', error);
      toast({
        title: "Error",
        description: "Failed to populate form fields. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products Management</h2>
        <div className="flex gap-2">
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} variant="outline">Add Product</Button>
            </DialogTrigger>
          <DialogContent 
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* AI Content Generator */}
              <AIContentGenerator
                gameId={selectedGameId}
                categoryId={formData.category_id}
                gameName={games.find(g => g.id === selectedGameId)?.name}
                categoryName={categories.find(c => c.id === formData.category_id)?.name}
                productType="simple"
                onFieldsGenerated={handleAIFieldsGenerated}
                isEditMode={!!editingProduct}
                existingProduct={editingProduct ? {
                  name: editingProduct.name,
                  slug: editingProduct.slug,
                  base_price: (editingProduct.base_price ?? 0).toString(),
                } : undefined}
              />

              {/* Inline AI Tools */}
              {editingProduct ? (
                <div className="space-y-2">
                  <InlineRewardsGenerator 
                    productId={editingProduct.id} 
                    productName={editingProduct.name} 
                  />
                  <InlineFAQGenerator 
                    productId={editingProduct.id} 
                    productName={editingProduct.name}
                    gameId={selectedGameId}
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30 opacity-60">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <HelpCircle className="h-5 w-5" />
                    <span className="font-medium">AI Rewards & FAQ Generator</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Save the product first to enable AI-powered rewards and FAQ generation.
                  </p>
                </div>
              )}

              <Tabs defaultValue="content" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="seo">SEO Settings</TabsTrigger>
                  <TabsTrigger value="settings">Product Settings</TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={async (e) => {
                        const newName = e.target.value;
                        setFormData({ ...formData, name: newName });
                        
                        // Auto-generate slug ONLY when creating new product (not editing)
                        if (!editingProduct && formData.category_id && newName) {
                          const autoSlug = await generateUniqueSlug(newName, formData.category_id);
                          setFormData(prev => ({ ...prev, name: newName, slug: autoSlug }));
                        }
                      }}
                      placeholder="e.g., Mythic Plus Dungeon Boost"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="auto-generated-from-name"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (formData.name && formData.category_id) {
                            const newSlug = await generateUniqueSlug(formData.name, formData.category_id, editingProduct?.id);
                            setFormData({ ...formData, slug: newSlug });
                            toast({ title: "Slug Generated", description: `New slug: ${newSlug}` });
                          }
                        }}
                      >
                        Regenerate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {editingProduct ? "⚠️ Changing slug will break existing links and SEO rankings" : "Slug is auto-generated from name"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="game">Game</Label>
                      <Select
                        value={selectedGameId}
                        onValueChange={(value) => {
                          setSelectedGameId(value);
                          setFormData({ ...formData, category_id: "" });
                        }}
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
                        onValueChange={(value) =>
                          setFormData({ ...formData, category_id: value })
                        }
                        disabled={!selectedGameId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="short_description">Short Description</Label>
                    <Input
                      id="short_description"
                      value={formData.short_description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          short_description: e.target.value,
                        })
                      }
                      placeholder="Brief description for listings"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                      placeholder="Full product description with formatting"
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="how_it_works">How It Works</Label>
                    <RichTextEditor
                      value={formData.how_it_works}
                      onChange={(value) => setFormData((prev) => ({ ...prev, how_it_works: value }))}
                      placeholder="Step-by-step guide with formatting"
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="requirements">Requirements</Label>
                    <RichTextEditor
                      value={formData.requirements}
                      onChange={(value) => setFormData((prev) => ({ ...prev, requirements: value }))}
                      placeholder="What customers need"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                {/* SEO Settings Tab */}
                <TabsContent value="seo" className="space-y-4 mt-4">
                  <SEOPreview
                    title={formData.meta_title || formData.name || "Product Name"}
                    description={formData.meta_description || formData.short_description || "Product description will appear here"}
                    url={`https://misti.services/${games.find(g => g.id === selectedGameId)?.slug || 'game'}/${categories.find(c => c.id === formData.category_id)?.slug || 'category'}/${formData.slug || 'product'}`}
                  />

                  <div>
                    <Label htmlFor="meta_title">Meta Title</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) =>
                        setFormData({ ...formData, meta_title: e.target.value })
                      }
                      placeholder="Custom SEO title (leave empty to auto-generate)"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.meta_title.length}/60 characters • Recommended: 50-60 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="meta_description">Meta Description</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) =>
                        setFormData({ ...formData, meta_description: e.target.value })
                      }
                      placeholder="A compelling description for search results (155-160 characters recommended)"
                      rows={3}
                      maxLength={170}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="meta_keywords">Meta Keywords</Label>
                    <Input
                      id="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={(e) =>
                        setFormData({ ...formData, meta_keywords: e.target.value })
                      }
                      placeholder="boost, gaming, service (comma-separated)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate keywords with commas. Focus on 3-5 relevant terms.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="og_image">OG Image (Social Sharing)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="og_image"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          setUploading(true);
                          const fileExt = file.name.split(".").pop();
                          const fileName = `og-${Math.random().toString(36).substring(2)}.${fileExt}`;
                          const { error, data } = await supabase.storage
                            .from("game-images")
                            .upload(fileName, file);

                          if (!error) {
                            const { data: { publicUrl } } = supabase.storage
                              .from("game-images")
                              .getPublicUrl(fileName);
                            setFormData({ ...formData, og_image: publicUrl });
                          }
                          setUploading(false);
                        }}
                        disabled={uploading}
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {formData.og_image && (
                      <img
                        src={formData.og_image}
                        alt="OG Preview"
                        className="mt-2 h-32 w-auto object-cover rounded"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 1200x630px for optimal social media display
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="image_alt_text">Image Alt Text</Label>
                    <Input
                      id="image_alt_text"
                      value={formData.image_alt_text}
                      onChange={(e) =>
                        setFormData({ ...formData, image_alt_text: e.target.value })
                      }
                      placeholder="Descriptive alt text for product image"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe what's in the image for accessibility and SEO
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="canonical_url">Canonical URL (Optional)</Label>
                    <Input
                      id="canonical_url"
                      value={formData.canonical_url}
                      onChange={(e) =>
                        setFormData({ ...formData, canonical_url: e.target.value })
                      }
                      placeholder="https://example.com/original-page"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Only set if this content exists elsewhere to avoid duplicate content issues
                    </p>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3">Internal Linking</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="parent_link">Parent/Related Product Link</Label>
                        <Input
                          id="parent_link"
                          value={formData.parent_link}
                          onChange={(e) =>
                            setFormData({ ...formData, parent_link: e.target.value })
                          }
                          placeholder="/game-slug/category-slug/product-slug"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Add an internal link to a related product for better SEO. Use the browser below to find and copy links.
                        </p>
                      </div>
                      
                      <InternalLinkBrowser
                        currentProductId={editingProduct?.id}
                        onSelectLink={(link) => setFormData({ ...formData, parent_link: link })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Product Settings Tab */}
                <TabsContent value="settings" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time_text">Start Time Text</Label>
                      <Input
                        id="start_time_text"
                        value={formData.start_time_text}
                        onChange={(e) =>
                          setFormData({ ...formData, start_time_text: e.target.value })
                        }
                        placeholder="e.g., 15 minutes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="start_time_value">Start Time Description</Label>
                      <Input
                        id="start_time_value"
                        value={formData.start_time_value}
                        onChange={(e) =>
                          setFormData({ ...formData, start_time_value: e.target.value })
                        }
                        placeholder="e.g., average start time"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery_text">Delivery Text</Label>
                      <Input
                        id="delivery_text"
                        value={formData.delivery_text}
                        onChange={(e) =>
                          setFormData({ ...formData, delivery_text: e.target.value })
                        }
                        placeholder="e.g., Flexible"
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery_value">Delivery Description</Label>
                      <Input
                        id="delivery_value"
                        value={formData.delivery_value}
                        onChange={(e) =>
                          setFormData({ ...formData, delivery_value: e.target.value })
                        }
                        placeholder="e.g., order completion"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="base_price">Base Price ($)</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="any"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) =>
                          setFormData({ ...formData, base_price: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="badge_text">Badge Text</Label>
                      <Input
                        id="badge_text"
                        value={formData.badge_text}
                        onChange={(e) =>
                          setFormData({ ...formData, badge_text: e.target.value })
                        }
                        placeholder="e.g., HIT, NEW"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="trust_score">Trust Score</Label>
                      <Input
                        id="trust_score"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.trust_score}
                        onChange={(e) =>
                          setFormData({ ...formData, trust_score: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="total_reviews">Total Reviews</Label>
                      <Input
                        id="total_reviews"
                        type="number"
                        min="0"
                        value={formData.total_reviews}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_reviews: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sort_order: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image">Product Image</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {formData.image_url && (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="mt-2 h-20 w-20 object-cover rounded"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: checked })
                          }
                        />
                        <Label htmlFor="is_active">Active</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_featured"
                          checked={formData.is_featured}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_featured: checked })
                          }
                        />
                        <Label htmlFor="is_featured">Featured</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_manually_popular"
                          checked={formData.is_manually_popular}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_manually_popular: checked })
                          }
                        />
                        <Label htmlFor="is_manually_popular">Popular</Label>
                      </div>
                    </div>
                  </div>

                  {/* Product Options Section */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Product Options</h3>
                        <p className="text-xs text-muted-foreground">Add customization options like dropdowns, checkboxes, and text fields</p>
                      </div>
                      <Button type="button" onClick={handleAddOption} size="sm" disabled={!editingProduct}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Option
                      </Button>
                    </div>

                    {!editingProduct ? (
                      <div className="bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          💡 Save the product first, then you can add configuration options in this tab.
                        </p>
                      </div>
                    ) : productOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No options yet. Add dropdown, checkbox, or text options to customize this product.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {productOptions.map((option) => (
                          <Card key={option.id} className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{option.label}</h4>
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                    {option.option_type}
                                  </span>
                                  {option.is_required && (
                                    <span className="text-xs bg-red-500/20 text-red-600 px-2 py-0.5 rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Name: {option.name}
                                </p>
                                {option.price_modifier != null && option.price_modifier !== 0 && (
                                  <p className="text-sm text-primary mt-1">
                                    Price modifier: {option.price_modifier_type === 'percentage' ? `${option.price_modifier}%` : `$${option.price_modifier}`}
                                  </p>
                                )}
                                {(option.option_type === 'select' || option.option_type === 'button_group' || option.option_type === 'checkbox') && option.options && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Options: {Array.isArray(option.options) && option.options.length > 0 && typeof option.options[0] === 'object' 
                                      ? option.options.map((o: any) => `${o.label} (${o.priceType === 'percentage' ? `${o.price}%` : `$${o.price}`})`).join(', ')
                                      : (option.options as string[]).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditOption(option)}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteOption(option.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </div>
              </form>
            </DialogContent>
          </Dialog>

          <BulkSEOGenerator
            totalProducts={products.length}
            productsNeedingSEO={productsNeedingSEO}
            onComplete={async () => {
              await fetchProducts();
              await fetchSEOCount();
            }}
          />

          <BulkMetaTitleGenerator
            onComplete={async () => {
              await fetchProducts();
            }}
          />
        </div>
      </div>

        {/* Option Add/Edit Dialog */}
        <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingOption ? "Edit Option" : "Add Option"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitOption} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="option_label">Option Title *</Label>
                  <Input
                    id="option_label"
                    value={optionFormData.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      const generatedName = newLabel
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s]/g, "")
                        .replace(/\s+/g, "_");
                      const shouldAutoFill = !editingOption || !optionFormData.name;
                      setOptionFormData({
                        ...optionFormData,
                        label: newLabel,
                        name: shouldAutoFill ? generatedName : optionFormData.name,
                      });
                    }}
                    placeholder="e.g., Server Selection"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="option_name">Option Name (ID) *</Label>
                  <Input
                    id="option_name"
                    value={optionFormData.name}
                    onChange={(e) =>
                      setOptionFormData({ ...optionFormData, name: e.target.value })
                    }
                    placeholder="e.g., server"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="option_type">Option Type *</Label>
                <Select
                  value={optionFormData.option_type}
                  onValueChange={(value: any) =>
                    setOptionFormData({ ...optionFormData, option_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="button_group">Button Group (like EU/US)</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="text">Text Field</SelectItem>
                    <SelectItem value="number">Number Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(optionFormData.option_type === 'select' || optionFormData.option_type === 'button_group') && (
                <div>
                  <Label>Options * (each option can have its own price)</Label>
                  <div className="space-y-3 mt-2">
                    {selectOptions.map((opt, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].label = e.target.value;
                                setSelectOptions(newOptions);
                              }}
                              placeholder={`Option ${index + 1} (e.g., EU, US)`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = selectOptions.filter((_, i) => i !== index);
                                setSelectOptions(newOptions.length > 0 ? newOptions : [{label: '', price: '0', priceType: 'fixed'}]);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="any"
                              value={opt.price}
                              onChange={(e) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].price = e.target.value;
                                setSelectOptions(newOptions);
                              }}
                              placeholder="Price"
                              className="flex-1"
                            />
                            <Select
                              value={opt.priceType}
                              onValueChange={(value) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].priceType = value;
                                setSelectOptions(newOptions);
                              }}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">$</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectOptions([...selectOptions, {label: '', price: '0', priceType: 'fixed'}])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {optionFormData.option_type === 'checkbox' && (
                <div>
                  <Label>Checkbox Options * (each can have its own price)</Label>
                  <div className="space-y-3 mt-2">
                    {selectOptions.map((opt, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].label = e.target.value;
                                setSelectOptions(newOptions);
                              }}
                              placeholder={`Checkbox ${index + 1} (e.g., Express Service)`}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOptions = selectOptions.filter((_, i) => i !== index);
                                setSelectOptions(newOptions.length > 0 ? newOptions : [{label: '', price: '0', priceType: 'fixed'}]);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="any"
                              value={opt.price}
                              onChange={(e) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].price = e.target.value;
                                setSelectOptions(newOptions);
                              }}
                              placeholder="Price"
                              className="flex-1"
                            />
                            <Select
                              value={opt.priceType}
                              onValueChange={(value) => {
                                const newOptions = [...selectOptions];
                                newOptions[index].priceType = value;
                                setSelectOptions(newOptions);
                              }}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">$</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectOptions([...selectOptions, {label: '', price: '0', priceType: 'fixed'}])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Checkbox
                    </Button>
                  </div>
                </div>
              )}

              {(optionFormData.option_type === 'text' || optionFormData.option_type === 'number') && (
                <div>
                  <Label htmlFor="default_value">Default Value</Label>
                  <Input
                    id="default_value"
                    type={optionFormData.option_type}
                    value={optionFormData.default_value}
                    onChange={(e) =>
                      setOptionFormData({ ...optionFormData, default_value: e.target.value })
                    }
                    placeholder="Optional default value"
                  />
                </div>
              )}

              {optionFormData.option_type === 'number' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_value">Min Value</Label>
                    <Input
                      id="min_value"
                      type="number"
                      value={optionFormData.min_value}
                      onChange={(e) =>
                        setOptionFormData({ ...optionFormData, min_value: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_value">Max Value</Label>
                    <Input
                      id="max_value"
                      type="number"
                      value={optionFormData.max_value}
                      onChange={(e) =>
                        setOptionFormData({ ...optionFormData, max_value: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_modifier">Price Modifier</Label>
                  <Input
                    id="price_modifier"
                    type="number"
                    step="any"
                    value={optionFormData.price_modifier}
                    onChange={(e) =>
                      setOptionFormData({ ...optionFormData, price_modifier: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="price_modifier_type">Modifier Type</Label>
                  <Select
                    value={optionFormData.price_modifier_type}
                    onValueChange={(value: any) =>
                      setOptionFormData({ ...optionFormData, price_modifier_type: value })
                    }
                  >
                    <SelectTrigger id="price_modifier_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Add extra cost: use $ for fixed amount (e.g., 5.99) or % for percentage (e.g., 10 for 10%)
              </p>

              {optionFormData.price_modifier_type === 'percentage' && (
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="percentage_applies_to_cumulative"
                    checked={optionFormData.percentage_applies_to_cumulative}
                    onCheckedChange={(checked) =>
                      setOptionFormData({ ...optionFormData, percentage_applies_to_cumulative: checked as boolean })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="percentage_applies_to_cumulative" className="cursor-pointer font-medium">
                      Apply % to Cumulative Total
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, the percentage applies to (base price + all previously selected options). 
                      When disabled, it applies only to the base price.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_required"
                  checked={optionFormData.is_required}
                  onCheckedChange={(checked) =>
                    setOptionFormData({ ...optionFormData, is_required: checked as boolean })
                  }
                />
                <Label htmlFor="is_required">Required Option</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingOption ? "Update Option" : "Add Option"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Filters Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </div>
          
          {/* Search Input */}
          <div>
            <Label htmlFor="product-search">Search Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                type="text"
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Game Filter */}
            <div>
              <Label>Game</Label>
              <Select value={filterGameId} onValueChange={(value) => {
                setFilterGameId(value);
                setFilterCategoryId("all"); // Reset category when game changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <Label>Category</Label>
              <Select 
                value={filterCategoryId} 
                onValueChange={setFilterCategoryId}
                disabled={!filterGameId || filterGameId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={filterGameId && filterGameId !== "all" ? "All Categories" : "Select Game First"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status Filter */}
            <div>
              <Label>Status</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Featured Filter */}
            <div>
              <Label>Featured</Label>
              <Select value={filterFeatured} onValueChange={setFilterFeatured}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Featured</SelectItem>
                  <SelectItem value="false">Not Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Popular Filter */}
            <div>
              <Label>Popular</Label>
              <Select value={filterPopular} onValueChange={setFilterPopular}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Popular</SelectItem>
                  <SelectItem value="false">Not Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Sort By */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Label className="whitespace-nowrap">Sort By:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sort_order">Default Order</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="missing_seo">Missing SEO First</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="ml-auto text-sm text-muted-foreground">
              Showing {products.length} of {products.length} products (Page {currentPage} of {totalPages})
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="flex gap-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {product.slug}
                </p>
                <p className="text-lg font-bold text-primary mt-1">
                  ${product.base_price}
                </p>
                <div className="flex gap-2 mt-2">
                  {product.is_active && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Active
                    </span>
                  )}
                  {product.is_featured && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => openEditDialog(product)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/admin?tab=faqs&productId=${product.id}`, '_blank')}
                title="Manage FAQs"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(product.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No products yet. Create your first product!
          </p>
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductsManager;
