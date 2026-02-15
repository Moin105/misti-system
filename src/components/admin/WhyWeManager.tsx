import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WhyWeFeature {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

const availableIcons = [
  "Clock",
  "Shield",
  "DollarSign",
  "Award",
  "Headset",
  "Rocket",
  "ShieldCheck",
  "Star",
  "Zap",
  "CheckCircle"
];

const WhyWeManager = () => {
  const [features, setFeatures] = useState<WhyWeFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<WhyWeFeature | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("why_we_features")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setFeatures(data || []);
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

  const handleSave = async () => {
    try {
      if (!editingFeature?.title || !editingFeature?.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      if (editingFeature.id) {
        const { error } = await supabase
          .from("why_we_features")
          .update({
            title: editingFeature.title,
            description: editingFeature.description,
            icon_name: editingFeature.icon_name,
            is_active: editingFeature.is_active,
          })
          .eq("id", editingFeature.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("why_we_features")
          .insert([{
            ...editingFeature,
            sort_order: features.length,
          }]);

        if (error) throw error;
      }

      toast({ title: "Success", description: "Feature saved successfully" });
      await refreshAdminData(['/rest/v1/why_we_features'], ['why-we-features']);
      setEditDialogOpen(false);
      setEditingFeature(null);
      fetchFeatures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;

    try {
      const { error } = await supabase
        .from("why_we_features")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Success", description: "Feature deleted successfully" });
      await refreshAdminData(['/rest/v1/why_we_features'], ['why-we-features']);
      fetchFeatures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (feature: WhyWeFeature) => {
    setEditingFeature(feature);
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingFeature({
      id: "",
      title: "",
      description: "",
      icon_name: "Clock",
      sort_order: features.length,
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Why We Features</h2>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableCell>{feature.sort_order}</TableCell>
                <TableCell className="font-medium">{feature.title}</TableCell>
                <TableCell className="max-w-md truncate">{feature.description}</TableCell>
                <TableCell>{feature.icon_name}</TableCell>
                <TableCell>
                  <span className={feature.is_active ? "text-green-600" : "text-gray-400"}>
                    {feature.is_active ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(feature)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(feature.id)}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent 
          className="max-w-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingFeature?.id ? "Edit Feature" : "Add Feature"}
            </DialogTitle>
            <DialogDescription>
              Configure the "Why We" feature details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editingFeature?.title || ""}
                onChange={(e) =>
                  setEditingFeature((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                placeholder="e.g., We respect Deadlines."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingFeature?.description || ""}
                onChange={(e) =>
                  setEditingFeature((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                placeholder="Describe the feature..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={editingFeature?.icon_name || "Clock"}
                onValueChange={(value) =>
                  setEditingFeature((prev) =>
                    prev ? { ...prev, icon_name: value } : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={editingFeature?.is_active || false}
                onCheckedChange={(checked) =>
                  setEditingFeature((prev) =>
                    prev ? { ...prev, is_active: checked } : null
                  )
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhyWeManager;
