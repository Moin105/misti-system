import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface AboutStat {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export function AboutStatsManager() {
  const [stats, setStats] = useState<AboutStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<AboutStat | null>(null);
  
  const [formData, setFormData] = useState({
    value: "",
    label: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from("about_stats")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStat) {
        const { error } = await supabase
          .from("about_stats")
          .update(formData)
          .eq("id", editingStat.id);

        if (error) throw error;
        toast.success("Stat updated successfully");
      } else {
        const { error } = await supabase
          .from("about_stats")
          .insert([formData]);

        if (error) throw error;
        toast.success("Stat created successfully");
      }

      await refreshAdminData(['/rest/v1/about_stats'], ['about-stats']);
      setDialogOpen(false);
      resetForm();
      loadStats();
    } catch (error) {
      console.error("Error saving stat:", error);
      toast.error("Failed to save stat");
    }
  };

  const handleEdit = (stat: AboutStat) => {
    setEditingStat(stat);
    setFormData({
      value: stat.value,
      label: stat.label,
      sort_order: stat.sort_order,
      is_active: stat.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stat?")) return;

    try {
      const { error } = await supabase
        .from("about_stats")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Stat deleted successfully");
      await refreshAdminData(['/rest/v1/about_stats'], ['about-stats']);
      loadStats();
    } catch (error) {
      console.error("Error deleting stat:", error);
      toast.error("Failed to delete stat");
    }
  };

  const resetForm = () => {
    setEditingStat(null);
    setFormData({
      value: "",
      label: "",
      sort_order: 0,
      is_active: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <CardTitle>About Us Statistics</CardTitle>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Stat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStat ? "Edit" : "Add"} Statistic</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., 10,000+"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Happy Customers"
                  required
                />
              </div>

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

              <Button type="submit" className="w-full">
                {editingStat ? "Update" : "Create"} Stat
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat) => (
              <TableRow key={stat.id}>
                <TableCell className="font-bold text-primary">{stat.value}</TableCell>
                <TableCell>{stat.label}</TableCell>
                <TableCell>{stat.sort_order}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${stat.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {stat.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(stat)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(stat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
