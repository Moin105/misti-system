import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ProductGuarantee {
  id: string;
  icon_name: string;
  title: string;
  subtitle: string;
  sort_order: number;
  is_active: boolean;
}

export const ProductGuaranteesManager = () => {
  const [guarantees, setGuarantees] = useState<ProductGuarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    icon_name: "",
    title: "",
    subtitle: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchGuarantees();
  }, []);

  const fetchGuarantees = async () => {
    try {
      const { data, error } = await supabase
        .from("product_guarantees")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setGuarantees(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch guarantees: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("product_guarantees")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        await refreshAdminData(['/rest/v1/product_guarantees'], ['product-guarantees']);
        toast.success("Guarantee updated successfully");
      } else {
        const { error } = await supabase.from("product_guarantees").insert(formData);

        if (error) throw error;
        await refreshAdminData(['/rest/v1/product_guarantees'], ['product-guarantees']);
        toast.success("Guarantee created successfully");
      }

      setFormData({ icon_name: "", title: "", subtitle: "", sort_order: 0, is_active: true });
      setEditingId(null);
      fetchGuarantees();
    } catch (error: any) {
      toast.error("Failed to save guarantee: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (guarantee: ProductGuarantee) => {
    setEditingId(guarantee.id);
    setFormData({
      icon_name: guarantee.icon_name,
      title: guarantee.title,
      subtitle: guarantee.subtitle,
      sort_order: guarantee.sort_order,
      is_active: guarantee.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guarantee?")) return;

    try {
      const { error } = await supabase.from("product_guarantees").delete().eq("id", id);

      if (error) throw error;
      await refreshAdminData(['/rest/v1/product_guarantees'], ['product-guarantees']);
      toast.success("Guarantee deleted successfully");
      fetchGuarantees();
    } catch (error: any) {
      toast.error("Failed to delete guarantee: " + error.message);
    }
  };

  if (loading && guarantees.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Guarantee" : "Add Guarantee"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon_name">Icon Name (Lucide)</Label>
                <Input
                  id="icon_name"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="Target, TrendingUp, Shield"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use Lucide icon names (e.g., Target, TrendingUp)
                </p>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Found cheaper?"
                  required
                />
              </div>
              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="We'll match the price"
                  required
                />
              </div>
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : editingId ? (
                  <Edit className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {editingId ? "Update" : "Add"} Guarantee
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ icon_name: "", title: "", subtitle: "", sort_order: 0, is_active: true });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Guarantees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guarantees.map((guarantee) => (
                <TableRow key={guarantee.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>{guarantee.icon_name}</TableCell>
                  <TableCell className="font-medium">{guarantee.title}</TableCell>
                  <TableCell>{guarantee.subtitle}</TableCell>
                  <TableCell>{guarantee.sort_order}</TableCell>
                  <TableCell>
                    {guarantee.is_active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(guarantee)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(guarantee.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
