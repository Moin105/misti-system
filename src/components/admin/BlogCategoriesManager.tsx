import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Tag, Palette } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import * as Icons from "lucide-react";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const BlogCategoriesManager = () => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon_name: "Tag",
    color: "#8B5CF6",
    sort_order: 0,
    is_active: true,
  });
  const { toast } = useToast();

  const iconOptions = [
    "Tag", "Gamepad2", "Newspaper", "Lightbulb", "Star", "Users", 
    "Trophy", "Zap", "Target", "Sword", "Shield", "Crown"
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("blog_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      icon_name: formData.icon_name,
      color: formData.color,
      sort_order: formData.sort_order,
      is_active: formData.is_active,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("blog_categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          title: "Error updating category",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Category updated successfully" });
        await refreshAdminData(['/rest/v1/blog_categories'], ['blog-categories']);
        resetForm();
        fetchCategories();
      }
    } else {
      const { error } = await supabase
        .from("blog_categories")
        .insert([categoryData]);

      if (error) {
        toast({
          title: "Error creating category",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Category created successfully" });
        await refreshAdminData(['/rest/v1/blog_categories'], ['blog-categories']);
        resetForm();
        fetchCategories();
      }
    }
  };

  const handleEdit = (category: BlogCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon_name: category.icon_name || "Tag",
      color: category.color,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("blog_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category deleted successfully" });
      await refreshAdminData(['/rest/v1/blog_categories'], ['blog-categories']);
      fetchCategories();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon_name: "Tag",
      color: "#8B5CF6",
      sort_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    return IconComponent ? <IconComponent className="w-5 h-5" /> : <Tag className="w-5 h-5" />;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {editingCategory ? "Edit Category" : "Create New Category"}
          </CardTitle>
          <CardDescription>
            Organize blog posts with categories for better readability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData({
                      ...formData,
                      name: newName,
                      slug: !editingCategory ? generateSlug(newName) : formData.slug,
                    });
                  }}
                  placeholder="e.g., Game Guides"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="game-guides"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this category"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <select
                  id="icon"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Preview: {getIconComponent(formData.icon_name)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Color
                </Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit">
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
              {editingCategory && (
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
          <CardTitle>All Categories</CardTitle>
          <CardDescription>Manage blog categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + "20" }}
                  >
                    <div style={{ color: category.color }}>
                      {getIconComponent(category.icon_name || "Tag")}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Slug: {category.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!category.is_active && (
                    <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure? Posts in this category will become uncategorized.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(category.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No categories yet. Create your first category to organize blog posts.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogCategoriesManager;
