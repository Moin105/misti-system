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

interface PaymentIcon {
  id: string;
  name: string;
  icon_url: string;
  sort_order: number;
  is_active: boolean;
}

export const PaymentIconsManager = () => {
  const [icons, setIcons] = useState<PaymentIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon_url: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchIcons();
  }, []);

  const fetchIcons = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_icons")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setIcons(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch payment icons: " + error.message);
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
          .from("payment_icons")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Payment icon updated successfully");
      } else {
        const { error } = await supabase.from("payment_icons").insert(formData);

        if (error) throw error;
        toast.success("Payment icon created successfully");
      }

      await refreshAdminData(['/rest/v1/payment_icons'], ['payment-icons']);
      setFormData({ name: "", icon_url: "", sort_order: 0, is_active: true });
      setEditingId(null);
      fetchIcons();
    } catch (error: any) {
      toast.error("Failed to save payment icon: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (icon: PaymentIcon) => {
    setEditingId(icon.id);
    setFormData({
      name: icon.name,
      icon_url: icon.icon_url,
      sort_order: icon.sort_order,
      is_active: icon.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment icon?")) return;

    try {
      const { error } = await supabase.from("payment_icons").delete().eq("id", id);

      if (error) throw error;
      toast.success("Payment icon deleted successfully");
      await refreshAdminData(['/rest/v1/payment_icons'], ['payment-icons']);
      fetchIcons();
    } catch (error: any) {
      toast.error("Failed to delete payment icon: " + error.message);
    }
  };

  if (loading && icons.length === 0) {
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
          <CardTitle>{editingId ? "Edit Payment Icon" : "Add Payment Icon"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="icon_url">Icon URL</Label>
                <Input
                  id="icon_url"
                  value={formData.icon_url}
                  onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                  placeholder="https://example.com/icon.svg"
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
                {editingId ? "Update" : "Add"} Icon
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ name: "", icon_url: "", sort_order: 0, is_active: true });
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
          <CardTitle>Payment Icons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {icons.map((icon) => (
                <TableRow key={icon.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell>
                    <img src={icon.icon_url} alt={icon.name} className="h-6 w-auto" />
                  </TableCell>
                  <TableCell className="font-medium">{icon.name}</TableCell>
                  <TableCell>{icon.sort_order}</TableCell>
                  <TableCell>
                    {icon.is_active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(icon)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(icon.id)}
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
