import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as Icons from "lucide-react";

interface ProductTrustBadge {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const POPULAR_ICONS = [
  'Shield', 'ShieldCheck', 'Lock', 'Clock', 'Zap',
  'Star', 'Award', 'CheckCircle', 'ThumbsUp', 'Heart',
  'Headphones', 'MessageCircle', 'Phone', 'Mail', 'Gift',
  'Package', 'Truck', 'RefreshCw', 'DollarSign', 'Wallet'
];

const ProductTrustBadgesManager = () => {
  const [badges, setBadges] = useState<ProductTrustBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    icon_name: "Shield",
    title: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("product_trust_badges")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error fetching trust badges:", error);
      toast({
        title: "Error",
        description: "Failed to fetch trust badges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from("product_trust_badges")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        await refreshAdminData(['/rest/v1/product_trust_badges'], ['product-trust-badges']);
        toast({ title: "Success", description: "Trust badge updated successfully" });
      } else {
        const { error } = await supabase
          .from("product_trust_badges")
          .insert([formData]);

        if (error) throw error;
        await refreshAdminData(['/rest/v1/product_trust_badges'], ['product-trust-badges']);
        toast({ title: "Success", description: "Trust badge added successfully" });
      }

      setFormData({ icon_name: "Shield", title: "", description: "", sort_order: 0, is_active: true });
      setEditingId(null);
      fetchBadges();
    } catch (error) {
      console.error("Error saving trust badge:", error);
      toast({
        title: "Error",
        description: "Failed to save trust badge",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (badge: ProductTrustBadge) => {
    setEditingId(badge.id);
    setFormData({
      icon_name: badge.icon_name,
      title: badge.title,
      description: badge.description,
      sort_order: badge.sort_order,
      is_active: badge.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trust badge?")) return;

    try {
      const { error } = await supabase
        .from("product_trust_badges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await refreshAdminData(['/rest/v1/product_trust_badges'], ['product-trust-badges']);
      toast({ title: "Success", description: "Trust badge deleted successfully" });
      fetchBadges();
    } catch (error) {
      console.error("Error deleting trust badge:", error);
      toast({
        title: "Error",
        description: "Failed to delete trust badge",
        variant: "destructive",
      });
    }
  };

  const IconComponent = Icons[formData.icon_name as keyof typeof Icons] as React.ComponentType<any>;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Product Trust Badges Manager</h2>
        <p className="text-muted-foreground">
          Manage trust badges displayed above product descriptions
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon_name">Icon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                      <span>{formData.icon_name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_ICONS.map((iconName) => {
                    const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{iconName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 100% Safe"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Secure transactions"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">{editingId ? "Update" : "Add"} Badge</Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ icon_name: "Shield", title: "", description: "", sort_order: 0, is_active: true });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Existing Trust Badges</h3>
        <div className="space-y-2">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  {(() => {
                    const Icon = Icons[badge.icon_name as keyof typeof Icons] as React.ComponentType<any>;
                    return Icon && <Icon className="w-5 h-5 text-accent" />;
                  })()}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {badge.title}
                    {!badge.is_active && (
                      <span className="text-xs text-muted-foreground">(Inactive)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{badge.description}</div>
                  <div className="text-xs text-muted-foreground">Sort: {badge.sort_order}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(badge)}
                >
                  <Icons.Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(badge.id)}
                >
                  <Icons.Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ProductTrustBadgesManager;
