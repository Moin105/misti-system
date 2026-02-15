import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ServiceHighlight {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const POPULAR_ICONS = [
  'Headset', 'DollarSign', 'Rocket', 'Clock', 'ShieldCheck', 
  'Star', 'Zap', 'Award', 'CheckCircle', 'Gift',
  'Heart', 'Lock', 'Mail', 'Phone', 'RefreshCw',
  'ThumbsUp', 'TrendingUp', 'Users', 'Wallet', 'Package'
];

const ServiceHighlightsManager = () => {
  const [highlights, setHighlights] = useState<ServiceHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    icon_name: "Headset",
    title: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from("service_highlights")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      setHighlights(data || []);
    } catch (error) {
      console.error("Error fetching highlights:", error);
      toast.error("Failed to load service highlights");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from("service_highlights")
          .update(formData)
          .eq("id", editingId);
        
        if (error) throw error;
        toast.success("Highlight updated successfully");
      } else {
        const { error } = await supabase
          .from("service_highlights")
          .insert([formData]);
        
        if (error) throw error;
        toast.success("Highlight created successfully");
      }
      
      await refreshAdminData(['/rest/v1/service_highlights'], ['service-highlights']);
      resetForm();
      fetchHighlights();
    } catch (error) {
      console.error("Error saving highlight:", error);
      toast.error("Failed to save highlight");
    }
  };

  const handleEdit = (highlight: ServiceHighlight) => {
    setEditingId(highlight.id);
    setFormData({
      icon_name: highlight.icon_name,
      title: highlight.title,
      description: highlight.description,
      sort_order: highlight.sort_order,
      is_active: highlight.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this highlight?")) return;
    
    try {
      const { error } = await supabase
        .from("service_highlights")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Highlight deleted successfully");
      await refreshAdminData(['/rest/v1/service_highlights'], ['service-highlights']);
      fetchHighlights();
    } catch (error) {
      console.error("Error deleting highlight:", error);
      toast.error("Failed to delete highlight");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      icon_name: "Headset",
      title: "",
      description: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const IconComponent = Icons[formData.icon_name as keyof typeof Icons] as React.ComponentType<any>;

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Add"} Service Highlight</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
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

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., 24/7 Support"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this service highlight"
                rows={3}
                required
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

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update" : "Create"} Highlight
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highlights.map((highlight) => {
              const Icon = Icons[highlight.icon_name as keyof typeof Icons] as React.ComponentType<any>;
              return (
                <div
                  key={highlight.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      {Icon && <Icon className="w-5 h-5 text-accent" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{highlight.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          (Order: {highlight.sort_order})
                        </span>
                        {!highlight.is_active && (
                          <span className="text-xs px-2 py-1 bg-muted rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {highlight.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(highlight)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(highlight.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceHighlightsManager;
