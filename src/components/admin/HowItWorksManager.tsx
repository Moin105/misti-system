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
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
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

interface HowItWorksStep {
  id: string;
  number: string;
  title: string;
  description: string;
  icon_name: string;
  highlight: string;
  sort_order: number;
  is_active: boolean;
}

const availableIcons = [
  "ShoppingCart",
  "MessageCircle",
  "Rocket",
  "Check",
  "UserCheck",
  "Package",
  "Shield",
  "Zap",
  "Star",
  "Award",
  "Clock",
];

const HowItWorksManager = () => {
  const [steps, setSteps] = useState<HowItWorksStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<HowItWorksStep> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("how_it_works_steps")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setSteps(data || []);
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

  const handleSaveStep = async () => {
    try {
      if (!editingItem?.title || !editingItem?.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      if (editingItem.id) {
        const { error } = await supabase
          .from("how_it_works_steps")
          .update(editingItem)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const newStep = {
          number: editingItem.number || "01",
          title: editingItem.title,
          description: editingItem.description,
          icon_name: editingItem.icon_name || "ShoppingCart",
          highlight: editingItem.highlight || "",
          is_active: editingItem.is_active ?? true,
          sort_order: steps.length,
        };
        const { error } = await supabase
          .from("how_it_works_steps")
          .insert([newStep]);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Step saved successfully" });
      await refreshAdminData(['/rest/v1/how_it_works_steps'], ['how-it-works-steps']);
      setEditDialogOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this step?")) return;

    try {
      const { error } = await supabase
        .from("how_it_works_steps")
        .delete()
        .eq("id", id);
      if (error) throw error;

      toast({ title: "Success", description: "Step deleted successfully" });
      await refreshAdminData(['/rest/v1/how_it_works_steps'], ['how-it-works-steps']);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (item: HowItWorksStep) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingItem({
      number: String(steps.length + 1).padStart(2, "0"),
      title: "",
      description: "",
      icon_name: "ShoppingCart",
      highlight: "",
      is_active: true,
    });
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">How It Works Steps</h3>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      </div>

      <div className="grid gap-4">
        {steps.map((step) => (
          <Card key={step.id} className="p-4">
            <div className="flex items-start gap-4">
              <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">{step.number}</span>
                    <div>
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.is_active}
                      onCheckedChange={async (checked) => {
                        await supabase
                          .from("how_it_works_steps")
                          .update({ is_active: checked })
                          .eq("id", step.id);
                        fetchData();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(step)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(step.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">Icon:</span>
                  <span className="font-medium">{step.icon_name}</span>
                  {step.highlight && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Highlight:</span>
                      <span className="font-medium">{step.highlight}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? "Edit" : "Add"} Step
            </DialogTitle>
            <DialogDescription>
              Update the step information below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number</Label>
                <Input
                  value={editingItem?.number || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, number: e.target.value })
                  }
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={editingItem?.icon_name || "ShoppingCart"}
                  onValueChange={(value) =>
                    setEditingItem({ ...editingItem, icon_name: value })
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
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editingItem?.title || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingItem?.description || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Highlight (optional badge text)</Label>
              <Input
                value={editingItem?.highlight || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, highlight: e.target.value })
                }
                placeholder="e.g., Fast, Popular"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editingItem?.is_active || false}
                onCheckedChange={(checked) =>
                  setEditingItem({ ...editingItem, is_active: checked })
                }
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStep}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HowItWorksManager;
