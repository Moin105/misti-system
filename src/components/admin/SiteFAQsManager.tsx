import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, HelpCircle } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";
import type { SiteFAQ } from "@/hooks/useSiteFAQs";

export const SiteFAQsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SiteFAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    sort_order: 0,
    is_active: true,
  });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["admin-site-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_faqs")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as SiteFAQ[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("site_faqs").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["site-faqs"] });
      toast.success("FAQ created successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Failed to create FAQ: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("site_faqs").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["site-faqs"] });
      toast.success("FAQ updated successfully");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Failed to update FAQ: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["site-faqs"] });
      toast.success("FAQ deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete FAQ: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("site_faqs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["site-faqs"] });
      toast.success("FAQ status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      sort_order: 0,
      is_active: true,
    });
  };

  const handleEdit = (faq: SiteFAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      is_active: faq.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    if (editingFaq) {
      updateMutation.mutate({ id: editingFaq.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-card rounded-lg h-20" />
        <div className="animate-pulse bg-card rounded-lg h-20" />
        <div className="animate-pulse bg-card rounded-lg h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Site FAQs
          </h2>
          <p className="text-muted-foreground">
            Manage FAQs displayed on the landing page
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleCloseDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFaq ? "Edit FAQ" : "Add New FAQ"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="Enter the question..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">Answer</Label>
                <RichTextEditor
                  value={formData.answer}
                  onChange={(value) =>
                    setFormData({ ...formData, answer: value })
                  }
                  placeholder="Enter the answer..."
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
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
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingFaq
                    ? "Update FAQ"
                    : "Create FAQ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {faqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No FAQs yet. Add your first FAQ to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card
              key={faq.id}
              className={`transition-opacity ${
                !faq.is_active ? "opacity-60" : ""
              }`}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex items-center gap-2 text-muted-foreground pt-1">
                  <GripVertical className="w-4 h-4 cursor-move" />
                  <span className="text-sm font-medium w-6 text-center">
                    {faq.sort_order}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 line-clamp-2">
                    {faq.question}
                  </h3>
                  <p
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(faq.answer).replace(/<[^>]*>/g, " ").slice(0, 150),
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={faq.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({
                        id: faq.id,
                        is_active: checked,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(faq)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this FAQ?")) {
                        deleteMutation.mutate(faq.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteFAQsManager;
