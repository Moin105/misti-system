import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarIcon, TrendingUp, ChevronDown, Search, Tag, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  applicable_games: string[] | null;
  applicable_categories: string[] | null;
  applicable_products: string[] | null;
  show_on_pages: string[] | null;
  promo_banner_text: string | null;
  promo_banner_color: string | null;
  min_order_amount: number | null;
  max_uses_per_user: number | null;
  description: string | null;
  first_order_only: boolean;
  created_at: string;
}


export const CouponsManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    discount_percentage: 10,
    max_uses: "",
    max_uses_per_user: "",
    min_order_amount: "",
    expires_at: undefined as Date | undefined,
    is_active: true,
    first_order_only: false,
    applicable_games: [] as string[],
    applicable_categories: [] as string[],
    applicable_products: [] as string[],
    description: "",
  });
  const queryClient = useQueryClient();

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: games } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, game_id")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, category_id, categories(name, game_id, games(name))")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearchQuery) return products.slice(0, 50);
    const query = productSearchQuery.toLowerCase();
    return products
      .filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.categories as any)?.name?.toLowerCase().includes(query) ||
        (p.categories as any)?.games?.name?.toLowerCase().includes(query)
      )
      .slice(0, 50);
  }, [products, productSearchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("coupons").insert({
        code: data.code.toUpperCase(),
        discount_percentage: data.discount_percentage,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        max_uses_per_user: data.max_uses_per_user ? parseInt(data.max_uses_per_user) : null,
        min_order_amount: data.min_order_amount ? parseFloat(data.min_order_amount) : null,
        expires_at: data.expires_at?.toISOString(),
        is_active: data.is_active,
        first_order_only: data.first_order_only,
        applicable_games: data.applicable_games.length > 0 ? data.applicable_games : null,
        applicable_categories: data.applicable_categories.length > 0 ? data.applicable_categories : null,
        applicable_products: data.applicable_products.length > 0 ? data.applicable_products : null,
        description: data.description || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create coupon");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("coupons")
        .update({
          code: data.code.toUpperCase(),
          discount_percentage: data.discount_percentage,
          max_uses: data.max_uses ? parseInt(data.max_uses) : null,
          max_uses_per_user: data.max_uses_per_user ? parseInt(data.max_uses_per_user) : null,
          min_order_amount: data.min_order_amount ? parseFloat(data.min_order_amount) : null,
          expires_at: data.expires_at?.toISOString(),
          is_active: data.is_active,
          first_order_only: data.first_order_only,
          applicable_games: data.applicable_games.length > 0 ? data.applicable_games : null,
          applicable_categories: data.applicable_categories.length > 0 ? data.applicable_categories : null,
          applicable_products: data.applicable_products.length > 0 ? data.applicable_products : null,
          description: data.description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update coupon");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, remove coupon reference from any orders that used this coupon
      const { error: ordersError } = await supabase
        .from("orders")
        .update({ coupon_id: null })
        .eq("coupon_id", id);
      
      if (ordersError) throw ordersError;

      // Then, delete related coupon_usage records
      const { error: usageError } = await supabase
        .from("coupon_usage")
        .delete()
        .eq("coupon_id", id);
      
      if (usageError) throw usageError;

      // Finally, delete the coupon
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete coupon");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon status updated");
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      discount_percentage: 10,
      max_uses: "",
      max_uses_per_user: "",
      min_order_amount: "",
      expires_at: undefined,
      is_active: true,
      first_order_only: false,
      applicable_games: [],
      applicable_categories: [],
      applicable_products: [],
      description: "",
    });
    setEditingCoupon(null);
    setProductSearchQuery("");
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage,
      max_uses: coupon.max_uses?.toString() || "",
      max_uses_per_user: coupon.max_uses_per_user?.toString() || "",
      min_order_amount: coupon.min_order_amount?.toString() || "",
      expires_at: coupon.expires_at ? new Date(coupon.expires_at) : undefined,
      is_active: coupon.is_active,
      first_order_only: coupon.first_order_only || false,
      applicable_games: coupon.applicable_games || [],
      applicable_categories: coupon.applicable_categories || [],
      applicable_products: coupon.applicable_products || [],
      description: coupon.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isUsageLimitReached = (coupon: Coupon) => {
    if (!coupon.max_uses) return false;
    return coupon.current_uses >= coupon.max_uses;
  };

  const getApplicabilityBadges = (coupon: Coupon) => {
    const badges = [];
    if (coupon.applicable_products?.length) {
      badges.push({ label: `${coupon.applicable_products.length} products`, color: "bg-blue-500/20 text-blue-600" });
    }
    if (coupon.applicable_categories?.length) {
      badges.push({ label: `${coupon.applicable_categories.length} categories`, color: "bg-purple-500/20 text-purple-600" });
    }
    if (coupon.applicable_games?.length) {
      badges.push({ label: `${coupon.applicable_games.length} games`, color: "bg-green-500/20 text-green-600" });
    }
    if (!badges.length) {
      badges.push({ label: "All products", color: "bg-muted text-muted-foreground" });
    }
    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coupons</h2>
          <p className="text-muted-foreground">Manage discount coupon codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
                  <TabsTrigger value="applicability">Applicability</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Coupon Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER20"
                        required
                        pattern="[A-Z0-9]+"
                        title="Only uppercase letters and numbers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount: {formData.discount_percentage}%</Label>
                      <Slider
                        value={[formData.discount_percentage]}
                        onValueChange={([value]) => setFormData({ ...formData, discount_percentage: value })}
                        min={1}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Internal)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Purpose of this coupon (only visible to admins)"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="first_order_only"
                        checked={formData.first_order_only}
                        onCheckedChange={(checked) => setFormData({ ...formData, first_order_only: checked })}
                      />
                      <Label htmlFor="first_order_only">First Order Only</Label>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="restrictions" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_uses">Total Uses Limit</Label>
                      <Input
                        id="max_uses"
                        type="number"
                        min="1"
                        value={formData.max_uses}
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_uses_per_user">Uses Per User</Label>
                      <Input
                        id="max_uses_per_user"
                        type="number"
                        min="1"
                        value={formData.max_uses_per_user}
                        onChange={(e) => setFormData({ ...formData, max_uses_per_user: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_order_amount">Minimum Order ($)</Label>
                      <Input
                        id="min_order_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.min_order_amount}
                        onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                        placeholder="No minimum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.expires_at && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expires_at ? format(formData.expires_at, "PPP") : "Never expires"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.expires_at}
                            onSelect={(date) => setFormData({ ...formData, expires_at: date })}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                          {formData.expires_at && (
                            <div className="p-2 border-t">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setFormData({ ...formData, expires_at: undefined })}
                              >
                                Clear expiry
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="applicability" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Leave all empty to apply to all products. Priority: Products &gt; Categories &gt; Games
                  </p>

                  {/* Products Selection */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">Specific Products</span>
                        {formData.applicable_products.length > 0 && (
                          <Badge variant="secondary">{formData.applicable_products.length} selected</Badge>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <ScrollArea className="h-48 border rounded-lg p-2">
                          {filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                              onClick={() => setFormData({
                                ...formData,
                                applicable_products: toggleArrayItem(formData.applicable_products, product.id)
                              })}
                            >
                              <Checkbox checked={formData.applicable_products.includes(product.id)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {(product.categories as any)?.games?.name} → {(product.categories as any)?.name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Games Selection */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        <span className="font-medium">Games</span>
                        {formData.applicable_games.length > 0 && (
                          <Badge variant="secondary">{formData.applicable_games.length} selected</Badge>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {games?.map((game) => (
                          <div
                            key={game.id}
                            className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => setFormData({
                              ...formData,
                              applicable_games: toggleArrayItem(formData.applicable_games, game.id)
                            })}
                          >
                            <Checkbox checked={formData.applicable_games.includes(game.id)} />
                            <span className="text-sm">{game.name}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Categories Selection */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        <span className="font-medium">Categories</span>
                        {formData.applicable_categories.length > 0 && (
                          <Badge variant="secondary">{formData.applicable_categories.length} selected</Badge>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <ScrollArea className="h-48">
                        <div className="grid grid-cols-2 gap-2">
                          {categories?.map((category) => {
                            const game = games?.find(g => g.id === category.game_id);
                            return (
                              <div
                                key={category.id}
                                className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                                onClick={() => setFormData({
                                  ...formData,
                                  applicable_categories: toggleArrayItem(formData.applicable_categories, category.id)
                                })}
                              >
                                <Checkbox checked={formData.applicable_categories.includes(category.id)} />
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{category.name}</p>
                                  {game && <p className="text-xs text-muted-foreground truncate">{game.name}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>

              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCoupon ? "Update" : "Create"} Coupon
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading coupons...</Card>
      ) : !coupons?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          No coupons yet. Create your first one!
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div>
                      <span className="font-mono font-bold">{coupon.code}</span>
                      {coupon.first_order_only && (
                        <Badge variant="secondary" className="ml-1 text-xs">1st order</Badge>
                      )}
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">
                        {coupon.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-semibold">{coupon.discount_percentage}%</span>
                      {coupon.min_order_amount && (
                        <p className="text-xs text-muted-foreground">Min ${coupon.min_order_amount}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span>{coupon.current_uses}/{coupon.max_uses || "∞"}</span>
                        {coupon.max_uses_per_user && (
                          <p className="text-xs text-muted-foreground">{coupon.max_uses_per_user}/user</p>
                        )}
                      </div>
                      {isUsageLimitReached(coupon) && (
                        <Badge variant="destructive">Limit</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getApplicabilityBadges(coupon).map((badge, i) => (
                        <Badge key={i} variant="outline" className={badge.color}>
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at ? (
                      <div className="flex items-center gap-2">
                        <span className={isExpired(coupon.expires_at) ? "text-destructive" : ""}>
                          {format(new Date(coupon.expires_at), "PP")}
                        </span>
                        {isExpired(coupon.expires_at) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this coupon?")) {
                            deleteMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
