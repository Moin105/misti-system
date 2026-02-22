import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { refreshAdminData } from "@/lib/adminSupabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";

const ReviewPlatformsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);

  const refreshReviewPlatformCaches = async () => {
    await refreshAdminData(
      ["/rest/v1/review_platforms", "/rest/v1/reviews"],
      ["review-platforms-admin", "review-platforms-for-reviews", "review-platforms", "initial-page-data", "reviews-admin", "reviews"]
    );
  };

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    url: "",
    logo_url: "",
    primary_color: "#000000",
    average_rating: 5.0,
    total_reviews: 0,
    is_active: true,
    sort_order: 0,
  });

  const { data: platforms, isLoading, refetch: refetchPlatforms } = useQuery({
    queryKey: ["review-platforms-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_platforms")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: createdPlatform, error } = await supabase
        .from("review_platforms")
        .insert([data])
        .select("*")
        .single();
      if (error) throw error;
      return createdPlatform;
    },
    onSuccess: async (createdPlatform) => {
      queryClient.setQueryData(["review-platforms-admin"], (prev: any[] | undefined) => {
        const next = [...(prev || []), createdPlatform];
        return next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });
      await refreshReviewPlatformCaches();
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-for-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms"] });
      await queryClient.invalidateQueries({ queryKey: ["initial-page-data"] });
      await refetchPlatforms();
      toast({ title: "Platform created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: updatedPlatform, error } = await supabase
        .from("review_platforms")
        .update(data)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return updatedPlatform;
    },
    onSuccess: async (updatedPlatform) => {
      queryClient.setQueryData(["review-platforms-admin"], (prev: any[] | undefined) => {
        const next = (prev || []).map((platform) =>
          platform.id === updatedPlatform.id ? updatedPlatform : platform
        );
        return next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });
      await refreshReviewPlatformCaches();
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-for-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms"] });
      await queryClient.invalidateQueries({ queryKey: ["initial-page-data"] });
      await refetchPlatforms();
      toast({ title: "Platform updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("review_platforms")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (deletedId) => {
      queryClient.setQueryData(["review-platforms-admin"], (prev: any[] | undefined) =>
        (prev || []).filter((platform) => platform.id !== deletedId)
      );
      await refreshReviewPlatformCaches();
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms-for-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["review-platforms"] });
      await queryClient.invalidateQueries({ queryKey: ["initial-page-data"] });
      await refetchPlatforms();
      toast({ title: "Platform deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      url: "",
      logo_url: "",
      primary_color: "#000000",
      average_rating: 5.0,
      total_reviews: 0,
      is_active: true,
      sort_order: 0,
    });
    setEditingPlatform(null);
  };

  const handleEdit = (platform: any) => {
    setEditingPlatform(platform);
    setFormData({
      name: platform.name,
      slug: platform.slug,
      url: platform.url,
      logo_url: platform.logo_url || "",
      primary_color: platform.primary_color,
      average_rating: platform.average_rating,
      total_reviews: platform.total_reviews,
      is_active: platform.is_active,
      sort_order: platform.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlatform) {
      updateMutation.mutate({ id: editingPlatform.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Review Platforms</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Platform
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPlatform ? "Edit" : "Add"} Review Platform
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Platform Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="url">Platform URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Brand Color</Label>
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="average_rating">Average Rating</Label>
                  <Input
                    id="average_rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.average_rating}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        average_rating: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="total_reviews">Total Reviews</Label>
                  <Input
                    id="total_reviews"
                    type="number"
                    value={formData.total_reviews}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_reviews: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlatform ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {platforms?.map((platform) => (
            <TableRow key={platform.id}>
              <TableCell className="font-medium">{platform.name}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">
                {platform.url}
              </TableCell>
              <TableCell>{platform.average_rating}</TableCell>
              <TableCell>{platform.total_reviews}</TableCell>
              <TableCell>{platform.is_active ? "Yes" : "No"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(platform)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(platform.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReviewPlatformsManager;
