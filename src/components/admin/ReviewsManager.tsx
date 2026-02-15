import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Star, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const ReviewsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);

  const [formData, setFormData] = useState({
    platform_id: "",
    author_name: "",
    rating: 5,
    title: "",
    content: "",
    is_verified: false,
    is_featured: false,
    review_url: "",
    posted_at: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  const { data: platforms } = useQuery({
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

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          review_platforms (name, primary_color)
        `)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("reviews").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews-admin"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Review created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("reviews").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews-admin"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Review updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews-admin"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Review deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      platform_id: "",
      author_name: "",
      rating: 5,
      title: "",
      content: "",
      is_verified: false,
      is_featured: false,
      review_url: "",
      posted_at: new Date().toISOString().split("T")[0],
      is_active: true,
    });
    setEditingReview(null);
  };

  const handleEdit = (review: any) => {
    setEditingReview(review);
    setFormData({
      platform_id: review.platform_id,
      author_name: review.author_name,
      rating: review.rating,
      title: review.title,
      content: review.content,
      is_verified: review.is_verified,
      is_featured: review.is_featured,
      review_url: review.review_url || "",
      posted_at: new Date(review.posted_at).toISOString().split("T")[0],
      is_active: review.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      posted_at: new Date(formData.posted_at).toISOString(),
    };
    
    if (editingReview) {
      updateMutation.mutate({ id: editingReview.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Review
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingReview ? "Edit" : "Add"} Review
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="platform_id">Platform</Label>
                <Select
                  value={formData.platform_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms?.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        {platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author_name">Author Name</Label>
                  <Input
                    id="author_name"
                    value={formData.author_name}
                    onChange={(e) =>
                      setFormData({ ...formData, author_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rating: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="review_url">Review URL (optional)</Label>
                  <Input
                    id="review_url"
                    type="url"
                    value={formData.review_url}
                    onChange={(e) =>
                      setFormData({ ...formData, review_url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="posted_at">Posted Date</Label>
                  <Input
                    id="posted_at"
                    type="date"
                    value={formData.posted_at}
                    onChange={(e) =>
                      setFormData({ ...formData, posted_at: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_verified"
                    checked={formData.is_verified}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_verified: checked })
                    }
                  />
                  <Label htmlFor="is_verified">Verified</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_featured: checked })
                    }
                  />
                  <Label htmlFor="is_featured">Featured</Label>
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
                  {editingReview ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Platform</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews?.map((review: any) => (
            <TableRow key={review.id}>
              <TableCell>
                <span
                  className="font-medium"
                  style={{ color: review.review_platforms.primary_color }}
                >
                  {review.review_platforms.name}
                </span>
              </TableCell>
              <TableCell>{review.author_name}</TableCell>
              <TableCell>
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3 h-3 fill-current"
                      style={{ color: review.review_platforms.primary_color }}
                    />
                  ))}
                </div>
              </TableCell>
              <TableCell className="max-w-xs truncate">{review.title}</TableCell>
              <TableCell>{format(new Date(review.posted_at), "MMM d, yyyy")}</TableCell>
              <TableCell>{review.is_featured ? "Yes" : "No"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {review.review_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(review.review_url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(review)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(review.id)}
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

export default ReviewsManager;
