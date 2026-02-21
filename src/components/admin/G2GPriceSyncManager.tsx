import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Edit, History, ExternalLink, Loader2, Layers, Search, Check, ChevronsUpDown, User } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface G2GSyncConfig {
  id: string;
  product_id: string;
  g2g_url: string;
  api_url: string | null;
  scrape_method: 'api' | 'scrape';
  price_unit: number;
  price_unit_label: string;
  markup_percentage: number;
  is_active: boolean;
  last_sync_at: string | null;
  last_g2g_price: number | null;
  last_our_price: number | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  sync_type: 'product' | 'option';
  product_option_id: string | null;
  option_label: string | null;
  target_seller: string | null;
  created_at: string;
  products: {
    id: string;
    name: string;
  };
  product_options?: {
    id: string;
    label: string;
  } | null;
}

interface SliderProduct {
  id: string;
  name: string;
  is_slider_product: boolean;
  slider_config: any;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  label: string;
  option_type: string;
  options: Array<{ label: string; value?: string; price?: number; [key: string]: any }>;
}

const PRICE_UNITS = [
  { value: 1, label: "per 1 (unit)" },
  { value: 100, label: "per 100" },
  { value: 1000, label: "per 1K (1,000)" },
  { value: 10000, label: "per 10K (10,000)" },
  { value: 100000, label: "per 100K (100,000)" },
  { value: 1000000, label: "per 1M (1,000,000)" },
];

export default function G2GPriceSyncManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<G2GSyncConfig | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingConfigId, setSyncingConfigId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    results: Array<{ name: string; success: boolean; error?: string }>;
  } | null>(null);
  const [currentSyncingName, setCurrentSyncingName] = useState<string | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [batchProductPopoverOpen, setBatchProductPopoverOpen] = useState(false);

  // Form state
  const [formSyncType, setFormSyncType] = useState<'product' | 'option'>('product');
  const [formProductId, setFormProductId] = useState("");
  const [formProductOptionId, setFormProductOptionId] = useState("");
  const [formOptionLabel, setFormOptionLabel] = useState("");
  const [formG2gUrl, setFormG2gUrl] = useState("");
  const [formApiUrl, setFormApiUrl] = useState("");
  const [formScrapeMethod, setFormScrapeMethod] = useState<'api' | 'scrape'>('scrape');
  const [formPriceUnit, setFormPriceUnit] = useState<number>(1000);
  const [formMarkup, setFormMarkup] = useState<number>(25);
  const [formTargetSeller, setFormTargetSeller] = useState<string>("");

  // Batch form state
  const [batchProductId, setBatchProductId] = useState("");
  const [batchProductOptionId, setBatchProductOptionId] = useState("");
  const [batchPriceUnit, setBatchPriceUnit] = useState<number>(1000);
  const [batchMarkup, setBatchMarkup] = useState<number>(25);
  const [batchEntries, setBatchEntries] = useState<Array<{ label: string; url: string; markup: number }>>([]);

  // Fetch sync configurations
  const { data: syncConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["g2g-sync-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("g2g_price_sync")
        .select(`
          *,
          products (
            id,
            name
          ),
          product_options (
            id,
            label
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as G2GSyncConfig[];
    },
  });

  // Fetch all products (slider and non-slider for options)
  const { data: allProducts } = useQuery({
    queryKey: ["all-products-for-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, is_slider_product, slider_config")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as SliderProduct[];
    },
  });

  // Fetch product options for selected product
  const { data: productOptions } = useQuery({
    queryKey: ["product-options-for-sync", formProductId || batchProductId],
    queryFn: async () => {
      const productId = formProductId || batchProductId;
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_options")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        options: (item.options as Array<{ label: string; value?: string; price?: number; [key: string]: any }>) || []
      })) as ProductOption[];
    },
    enabled: !!(formProductId || batchProductId),
  });

  // Get selected product option's labels for batch dialog
  const selectedBatchOption = productOptions?.find(po => po.id === batchProductOptionId);

  // Initialize batch entries when option is selected
  useEffect(() => {
    if (selectedBatchOption?.options && Array.isArray(selectedBatchOption.options)) {
      const labels = selectedBatchOption.options
        .map(opt => opt?.label || opt)
        .filter((label): label is string => !!label);
      
      setBatchEntries(labels.map(label => ({
        label,
        url: "",
        markup: batchMarkup,
      })));
    }
  }, [batchProductOptionId, selectedBatchOption, batchMarkup]);

  // Fetch price history for selected config
  const { data: priceHistory } = useQuery({
    queryKey: ["g2g-price-history", selectedConfigId],
    queryFn: async () => {
      if (!selectedConfigId) return [];
      const { data, error } = await supabase
        .from("g2g_price_history")
        .select("*")
        .eq("sync_config_id", selectedConfigId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedConfigId,
  });

  // Create sync config mutation
  const createMutation = useMutation({
    mutationFn: async (config: {
      product_id: string;
      g2g_url: string;
      api_url?: string;
      scrape_method: 'api' | 'scrape';
      price_unit: number;
      markup_percentage: number;
      sync_type: 'product' | 'option';
      product_option_id?: string;
      option_label?: string;
      target_seller?: string;
    }) => {
      const priceUnitLabel = PRICE_UNITS.find(u => u.value === config.price_unit)?.label || `per ${config.price_unit}`;
      
      const insertData = {
        product_id: config.product_id,
        g2g_url: config.g2g_url,
        api_url: config.api_url || null,
        scrape_method: config.scrape_method,
        price_unit: config.price_unit,
        price_unit_label: priceUnitLabel,
        markup_percentage: config.markup_percentage,
        sync_type: config.sync_type,
        product_option_id: config.product_option_id || null,
        option_label: config.option_label || null,
        target_seller: config.target_seller || null,
      };
      
      const { data, error } = await supabase.from("g2g_price_sync").insert(insertData).select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
      toast.success("Sync configuration added");
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error_description || "Failed to add configuration";
      toast.error(errorMessage);
    },
  });

  // Batch create mutation
  const batchCreateMutation = useMutation({
    mutationFn: async (configs: Array<{
      product_id: string;
      g2g_url: string;
      price_unit: number;
      markup_percentage: number;
      sync_type: 'option';
      product_option_id: string;
      option_label: string;
    }>) => {
      const priceUnitLabel = PRICE_UNITS.find(u => u.value === configs[0]?.price_unit)?.label || `per ${configs[0]?.price_unit}`;
      
      const insertData = configs.map(config => ({
        product_id: config.product_id,
        g2g_url: config.g2g_url,
        price_unit: config.price_unit,
        price_unit_label: priceUnitLabel,
        markup_percentage: config.markup_percentage,
        sync_type: config.sync_type,
        product_option_id: config.product_option_id,
        option_label: config.option_label,
        scrape_method: 'scrape',
      }));

      const { error } = await supabase.from("g2g_price_sync").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
      toast.success("Batch configurations added");
      resetBatchForm();
      setIsBatchDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add batch configurations");
    },
  });

  // Update sync config mutation
  const updateMutation = useMutation({
    mutationFn: async (config: {
      id: string;
      g2g_url: string;
      api_url?: string | null;
      scrape_method: 'api' | 'scrape';
      price_unit: number;
      markup_percentage: number;
      is_active: boolean;
      target_seller?: string | null;
    }) => {
      const priceUnitLabel = PRICE_UNITS.find(u => u.value === config.price_unit)?.label || `per ${config.price_unit}`;
      
      const { error } = await supabase
        .from("g2g_price_sync")
        .update({
          g2g_url: config.g2g_url,
          api_url: config.api_url || null,
          scrape_method: config.scrape_method,
          price_unit: config.price_unit,
          price_unit_label: priceUnitLabel,
          markup_percentage: config.markup_percentage,
          is_active: config.is_active,
          target_seller: config.target_seller || null,
        })
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
      toast.success("Configuration updated");
      setEditingConfig(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update configuration");
    },
  });

  // Delete sync config mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("g2g_price_sync").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
      toast.success("Configuration deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete configuration");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("g2g_price_sync")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  // Sync single config
  const syncConfig = async (configId: string) => {
    setSyncingConfigId(configId);
    try {
      const { data, error } = await supabase.functions.invoke("sync-g2g-prices", {
        body: { configId },
      });

      if (error) throw error;

      if (data.success) {
        const result = data.results?.[0];
        if (result?.success) {
          toast.success(`Synced! G2G: $${result.g2gPrice?.toFixed(6)} → Our: $${result.ourPrice?.toFixed(6)}`);
        } else {
          toast.error(result?.error || "Sync failed");
        }
      } else {
        toast.error(data.error || "Sync failed");
      }

      queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to sync");
    } finally {
      setSyncingConfigId(null);
    }
  };

  // Sync all with progress tracking
  const syncAll = async () => {
    const activeConfigs = syncConfigs?.filter(c => c.is_active) || [];
    if (activeConfigs.length === 0) {
      toast.info("No active configurations to sync");
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: activeConfigs.length, results: [] });

    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < activeConfigs.length; i++) {
      const config = activeConfigs[i];
      const configName = `${config.products.name}${config.option_label ? ` - ${config.option_label}` : ''}`;
      
      setCurrentSyncingName(configName);

      try {
        const { data, error } = await supabase.functions.invoke("sync-g2g-prices", {
          body: { configId: config.id },
        });

        if (error) throw error;

        const result = data.results?.[0];
        results.push({
          name: configName,
          success: result?.success || false,
          error: result?.error,
        });
      } catch (error: any) {
        results.push({
          name: configName,
          success: false,
          error: error.message || "Failed to sync",
        });
      }

      setSyncProgress({
        current: i + 1,
        total: activeConfigs.length,
        results: [...results],
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    toast.success(`Synced ${successCount} configs${failCount > 0 ? `, ${failCount} failed` : ""}`);

    queryClient.invalidateQueries({ queryKey: ["g2g-sync-configs"] });
    setIsSyncingAll(false);
    setCurrentSyncingName(null);
    
    // Keep progress visible briefly before clearing
    setTimeout(() => setSyncProgress(null), 3000);
  };

  const resetForm = () => {
    setFormSyncType('product');
    setFormProductId("");
    setFormProductOptionId("");
    setFormOptionLabel("");
    setFormG2gUrl("");
    setFormApiUrl("");
    setFormScrapeMethod('scrape');
    setFormPriceUnit(1000);
    setFormMarkup(25);
    setFormTargetSeller("");
  };

  const resetBatchForm = () => {
    setBatchProductId("");
    setBatchProductOptionId("");
    setBatchPriceUnit(1000);
    setBatchMarkup(25);
    setBatchEntries([]);
  };

  const handleSubmit = () => {
    if (!formProductId || !formG2gUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formSyncType === 'option' && (!formProductOptionId || !formOptionLabel)) {
      toast.error("Please select a product option and option value");
      return;
    }

    createMutation.mutate({
      product_id: formProductId,
      g2g_url: formG2gUrl,
      api_url: formApiUrl || undefined,
      scrape_method: formScrapeMethod,
      price_unit: formPriceUnit,
      markup_percentage: formMarkup,
      sync_type: formSyncType,
      product_option_id: formSyncType === 'option' ? formProductOptionId : undefined,
      option_label: formSyncType === 'option' ? formOptionLabel : undefined,
      target_seller: formTargetSeller || undefined,
    });
  };

  const handleBatchSubmit = () => {
    if (!batchProductId || !batchProductOptionId) {
      toast.error("Please select a product and option");
      return;
    }

    const validEntries = batchEntries.filter(e => e.url.trim());
    if (validEntries.length === 0) {
      toast.error("Please enter at least one G2G URL");
      return;
    }

    batchCreateMutation.mutate(
      validEntries.map(entry => ({
        product_id: batchProductId,
        g2g_url: entry.url,
        price_unit: batchPriceUnit,
        markup_percentage: entry.markup,
        sync_type: 'option' as const,
        product_option_id: batchProductOptionId,
        option_label: entry.label,
      }))
    );
  };

  const handleUpdate = () => {
    if (!editingConfig) return;

    updateMutation.mutate({
      id: editingConfig.id,
      g2g_url: editingConfig.g2g_url,
      api_url: editingConfig.api_url,
      scrape_method: editingConfig.scrape_method,
      price_unit: editingConfig.price_unit,
      markup_percentage: editingConfig.markup_percentage,
      is_active: editingConfig.is_active,
      target_seller: editingConfig.target_seller,
    });
  };

  // All products are available for sync (both slider and simple products)
  // Simple products will update base_price, slider products will update slider_config

  // Get option labels for the selected product option
  const selectedProductOption = productOptions?.find(po => po.id === formProductOptionId);
  const optionLabels = (Array.isArray(selectedProductOption?.options) 
    ? selectedProductOption.options.map(opt => (typeof opt === 'object' ? opt?.label : opt)).filter(Boolean) 
    : []) || [];

  const getTargetLabel = (config: G2GSyncConfig) => {
    if (config.sync_type === 'option' && config.option_label) {
      const optionName = config.product_options?.label || 'Option';
      return `${optionName}: ${config.option_label}`;
    }
    return "Product Price";
  };

  // Filter configs based on search query
  const filteredConfigs = syncConfigs?.filter(config => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const productName = config.products?.name?.toLowerCase() || '';
    const optionLabel = config.option_label?.toLowerCase() || '';
    const productOptionLabel = config.product_options?.label?.toLowerCase() || '';
    const targetLabel = getTargetLabel(config).toLowerCase();
    
    return (
      productName.includes(query) ||
      optionLabel.includes(query) ||
      productOptionLabel.includes(query) ||
      targetLabel.includes(query)
    );
  });

  const getStatusBadge = (status: string | null, error: string | null) => {
    if (!status || status === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (status === "success") {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Success</Badge>;
    }
    return (
      <Badge variant="destructive" title={error || "Error"}>
        Error
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">G2G Price Sync</h2>
          <p className="text-muted-foreground">
            Automatically sync product and option prices from G2G with configurable markup
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={syncAll} disabled={isSyncingAll || !syncConfigs?.length}>
            {isSyncingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync All Now
          </Button>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Single
          </Button>
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)}>
            <Layers className="w-4 h-4 mr-2" />
            Batch Add
          </Button>
        </div>
      </div>

      {/* Progress Bar for Sync All */}
      {syncProgress && (
        <div className="relative p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 animate-fade-in">
          {/* Gradient top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-xl" />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Syncing {syncProgress.current} of {syncProgress.total} configs...
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round((syncProgress.current / syncProgress.total) * 100)}%
              </span>
            </div>
            
            {currentSyncingName && (
              <p className="text-xs text-muted-foreground truncate">
                {currentSyncingName}
              </p>
            )}
            
            <Progress 
              value={(syncProgress.current / syncProgress.total) * 100} 
              className="h-2"
            />
            
            {syncProgress.results.length > 0 && (
              <div className="flex gap-4 text-xs">
                <span className="text-green-500">
                  {syncProgress.results.filter(r => r.success).length} succeeded
                </span>
                {syncProgress.results.some(r => !r.success) && (
                  <span className="text-destructive">
                    {syncProgress.results.filter(r => !r.success).length} failed
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add G2G Price Sync</DialogTitle>
                <DialogDescription>
                  Configure a product or option to sync prices from G2G
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sync Type</Label>
                  <RadioGroup
                    value={formSyncType}
                    onValueChange={(v) => {
                      setFormSyncType(v as 'product' | 'option');
                      setFormProductId("");
                      setFormProductOptionId("");
                      setFormOptionLabel("");
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="product" id="product" />
                      <Label htmlFor="product">Product Price</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option" id="option" />
                      <Label htmlFor="option">Custom Option Price</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Product</Label>
                  <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productPopoverOpen}
                        className="w-full justify-between"
                      >
                        {formProductId
                          ? allProducts?.find((product) => product.id === formProductId)?.name
                          : "Select a product..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {allProducts?.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                  setFormProductId(product.id);
                                  setFormProductOptionId("");
                                  setFormOptionLabel("");
                                  setProductPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formProductId === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {product.name}
                                {!product.is_slider_product && (
                                  <Badge variant="outline" className="ml-2 text-xs">Simple</Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {formSyncType === 'option' && formProductId && (
                  <>
                    <div className="space-y-2">
                      <Label>Product Option</Label>
                      <Select 
                        value={formProductOptionId} 
                        onValueChange={(v) => {
                          setFormProductOptionId(v);
                          setFormOptionLabel("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product option" />
                        </SelectTrigger>
                        <SelectContent>
                          {productOptions?.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label} ({option.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formProductOptionId && (
                      <div className="space-y-2">
                        <Label>Option Value</Label>
                        <Select value={formOptionLabel} onValueChange={setFormOptionLabel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option value" />
                          </SelectTrigger>
                          <SelectContent>
                            {optionLabels.map((label) => (
                              <SelectItem key={label} value={label}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <Label>Scrape Method</Label>
                  <Select
                    value={formScrapeMethod}
                    onValueChange={(v) => setFormScrapeMethod(v as 'api' | 'scrape')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scrape">Scrape (Firecrawl)</SelectItem>
                      <SelectItem value="api">Direct API Call</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    API method is more reliable if you have the G2G API endpoint URL
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>G2G Product URL</Label>
                  <Input
                    placeholder="https://www.g2g.com/offer/..."
                    value={formG2gUrl}
                    onChange={(e) => setFormG2gUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The public G2G page URL (used for scraping fallback)
                  </p>
                </div>

                {formScrapeMethod === 'api' && (
                  <div className="space-y-2">
                    <Label>G2G API URL (Optional)</Label>
                    <Input
                      placeholder="https://sls.g2g.com/offer/..."
                      value={formApiUrl}
                      onChange={(e) => setFormApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The internal G2G API endpoint that returns JSON price data
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Price Unit</Label>
                  <Select
                    value={formPriceUnit.toString()}
                    onValueChange={(v) => setFormPriceUnit(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value.toString()}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Markup Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      value={formMarkup}
                      onChange={(e) => setFormMarkup(parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Seller (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., Lockbox"
                      value={formTargetSeller}
                      onChange={(e) => setFormTargetSeller(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use 4th lowest price. Enter seller username to sync from their offers only.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Configuration
                </Button>
              </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Add Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Add Option Syncs</DialogTitle>
            <DialogDescription>
              Add G2G URLs for multiple option values at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Popover open={batchProductPopoverOpen} onOpenChange={setBatchProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={batchProductPopoverOpen}
                      className="w-full justify-between"
                    >
                      {batchProductId
                        ? allProducts?.find((product) => product.id === batchProductId)?.name
                        : "Select a product..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {allProducts?.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => {
                                setBatchProductId(product.id);
                                setBatchProductOptionId("");
                                setBatchEntries([]);
                                setBatchProductPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  batchProductId === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {batchProductId && (
                <div className="space-y-2">
                  <Label>Product Option</Label>
                  <Select 
                    value={batchProductOptionId} 
                    onValueChange={setBatchProductOptionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions?.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price Unit</Label>
                <Select
                  value={batchPriceUnit.toString()}
                  onValueChange={(v) => setBatchPriceUnit(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value.toString()}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Markup %</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={batchMarkup}
                  onChange={(e) => {
                    const newMarkup = parseFloat(e.target.value) || 0;
                    setBatchMarkup(newMarkup);
                    setBatchEntries(entries => entries.map(e => ({ ...e, markup: newMarkup })));
                  }}
                />
              </div>
            </div>

            {batchEntries.length > 0 && (
              <div className="space-y-3 mt-4">
                <Label>Option URLs</Label>
                {batchEntries.map((entry, idx) => (
                  <div key={entry.label} className="grid grid-cols-[120px_1fr_80px] gap-2 items-center">
                    <span className="text-sm font-medium truncate" title={entry.label}>
                      {entry.label}
                    </span>
                    <Input
                      placeholder="https://www.g2g.com/offer/..."
                      value={entry.url}
                      onChange={(e) => {
                        const newEntries = [...batchEntries];
                        newEntries[idx].url = e.target.value;
                        setBatchEntries(newEntries);
                      }}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      value={entry.markup}
                      onChange={(e) => {
                        const newEntries = [...batchEntries];
                        newEntries[idx].markup = parseFloat(e.target.value) || 0;
                        setBatchEntries(newEntries);
                      }}
                      className="w-20"
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Leave URL empty to skip an option. Each option can have a different markup %.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBatchSubmit} 
              disabled={batchCreateMutation.isPending || batchEntries.filter(e => e.url).length === 0}
            >
              {batchCreateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {batchEntries.filter(e => e.url).length} Configurations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Configured Syncs</CardTitle>
          <CardDescription>
            Products and options configured for automatic price syncing from G2G
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, option, or server..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredConfigs?.length || 0} of {syncConfigs?.length || 0} configurations
              </p>
            )}
          </div>

          {isLoadingConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : syncConfigs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No syncs configured yet. Add a product or option to get started.
            </div>
          ) : filteredConfigs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No configurations match your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Price Unit</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead>G2G Price</TableHead>
                  <TableHead>Our Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs?.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.products.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={config.sync_type === 'option' ? 'secondary' : 'outline'}>
                          {getTargetLabel(config)}
                        </Badge>
                        {config.target_seller && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <User className="w-3 h-3 mr-1" />
                            {config.target_seller}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.scrape_method === 'api' ? 'default' : 'outline'} className="text-xs">
                        {config.scrape_method === 'api' ? 'API' : 'Scrape'}
                      </Badge>
                    </TableCell>
                    <TableCell>{config.price_unit_label}</TableCell>
                    <TableCell>{config.markup_percentage}%</TableCell>
                    <TableCell>
                      {config.last_g2g_price != null
                        ? `$${Number(config.last_g2g_price).toFixed(6)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {config.last_our_price != null
                        ? `$${Number(config.last_our_price).toFixed(6)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(config.last_sync_status, config.last_sync_error)}
                    </TableCell>
                    <TableCell>
                      {config.last_sync_at
                        ? formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: config.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => syncConfig(config.id)}
                          disabled={syncingConfigId === config.id}
                          title="Sync now"
                        >
                          {syncingConfigId === config.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedConfigId(config.id);
                            setIsHistoryDialogOpen(true);
                          }}
                          title="View history"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(config.g2g_url, "_blank")}
                          title="Open G2G page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingConfig(config)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this sync configuration?")) {
                              deleteMutation.mutate(config.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sync Configuration</DialogTitle>
            <DialogDescription>
              Update sync settings for {editingConfig?.products.name}
              {editingConfig?.sync_type === 'option' && ` - ${editingConfig.option_label}`}
            </DialogDescription>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scrape Method</Label>
                <Select
                  value={editingConfig.scrape_method}
                  onValueChange={(v) =>
                    setEditingConfig({ ...editingConfig, scrape_method: v as 'api' | 'scrape' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scrape">Scrape (Firecrawl)</SelectItem>
                    <SelectItem value="api">Direct API Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>G2G Product URL</Label>
                <Input
                  value={editingConfig.g2g_url}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, g2g_url: e.target.value })
                  }
                />
              </div>
              {editingConfig.scrape_method === 'api' && (
                <div className="space-y-2">
                  <Label>G2G API URL</Label>
                  <Input
                    placeholder="https://sls.g2g.com/offer/..."
                    value={editingConfig.api_url || ''}
                    onChange={(e) =>
                      setEditingConfig({ ...editingConfig, api_url: e.target.value || null })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal G2G API endpoint that returns JSON price data
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Price Unit</Label>
                <Select
                  value={editingConfig.price_unit.toString()}
                  onValueChange={(v) =>
                    setEditingConfig({ ...editingConfig, price_unit: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value.toString()}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Markup Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    value={editingConfig.markup_percentage}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        markup_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Seller (Optional)</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g., Lockbox"
                    value={editingConfig.target_seller || ''}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        target_seller: e.target.value || null,
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use 4th lowest price. Enter seller username to sync from their offers only.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>Historical price syncs for this configuration</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {priceHistory?.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No price history yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>G2G Price</TableHead>
                    <TableHead>Our Price</TableHead>
                    <TableHead>Markup</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>${Number(entry.g2g_price).toFixed(6)}</TableCell>
                      <TableCell>${Number(entry.our_price).toFixed(6)}</TableCell>
                      <TableCell>{entry.markup_applied}%</TableCell>
                      <TableCell>
                        {PRICE_UNITS.find((u) => u.value === entry.price_unit)?.label ||
                          `per ${entry.price_unit}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
