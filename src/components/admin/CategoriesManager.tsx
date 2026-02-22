import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Game {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  game_id: string;
  sort_order: number;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
}

const CategoriesManager = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    sort_order: 0,
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: ""
  });

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      fetchCategories();
    }
  }, [selectedGameId]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive"
      });
    } else {
      setGames(data || []);
      if (data && data.length > 0) {
        setSelectedGameId(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    if (!selectedGameId) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", selectedGameId)
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    } else {
      setCategories(data || []);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with dashes
      .replace(/-+/g, '-');      // Replace multiple dashes with single dash
  };

  const checkSlugExists = async (slug: string, excludeId?: string): Promise<boolean> => {
    if (!selectedGameId) return false;

    let query = supabase
      .from("categories")
      .select("id")
      .eq("game_id", selectedGameId)
      .eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query.maybeSingle();
    return !!data;
  };

  const generateUniqueSlug = async (baseName: string, excludeId?: string): Promise<string> => {
    let slug = generateSlug(baseName);
    const exists = await checkSlugExists(slug, excludeId);

    if (exists) {
      // Add random 4-digit number if slug exists
      const randomId = Math.floor(1000 + Math.random() * 9000);
      slug = `${slug}-${randomId}`;
    }

    return slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !selectedGameId) {
      toast({
        title: "Error",
        description: "Name and game are required",
        variant: "destructive"
      });
      return;
    }

    // Generate unique slug only if creating new OR if slug field is empty
    const uniqueSlug = editingCategory 
      ? formData.slug  // Preserve existing slug when editing
      : await generateUniqueSlug(formData.name);

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: formData.name,
          slug: uniqueSlug,
          description: formData.description || null,
          icon: formData.icon || null,
          sort_order: formData.sort_order,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          meta_keywords: formData.meta_keywords || null,
          og_image: formData.og_image || null
        })
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update category",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Category updated successfully"
        });
        await refreshAdminData(['/rest/v1/categories'], ['categories']);
        fetchCategories();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("categories")
        .insert({
          name: formData.name,
          slug: uniqueSlug,
          description: formData.description || null,
          icon: formData.icon || null,
          game_id: selectedGameId,
          sort_order: formData.sort_order,
          is_active: true,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          meta_keywords: formData.meta_keywords || null,
          og_image: formData.og_image || null
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create category",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Category created successfully"
        });
        await refreshAdminData(['/rest/v1/categories'], ['categories']);
        fetchCategories();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const nowIso = new Date().toISOString();
    const { data: category, error: categoryFetchError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", id)
      .single();

    if (categoryFetchError) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
      return;
    }

    const { data: categoryUrl, error: urlError } = await supabase.rpc("get_category_url", {
      category_id: id,
    });
    if (urlError) {
      toast({
        title: "Error",
        description: "Failed to resolve category URL",
        variant: "destructive"
      });
      return;
    }

    const { error: softDeleteError } = await supabase
      .from("categories")
      .update({ is_active: false, updated_at: nowIso })
      .eq("id", id);

    if (softDeleteError) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
      return;
    }

    if (categoryUrl) {
      const { error: deletedUrlError } = await supabase
        .from("deleted_urls")
        .upsert(
          {
            url_path: categoryUrl,
            content_type: "category",
            content_id: id,
            original_title: category?.name ?? null,
          },
          { onConflict: "url_path" },
        );
      if (deletedUrlError) {
        console.error("Failed adding category URL to deleted list:", deletedUrlError);
      }
    }

    toast({
      title: "Success",
      description: "Category moved to 410 deleted URLs list"
    });
    await refreshAdminData(['/rest/v1/categories', '/rest/v1/deleted_urls'], ['categories', 'deleted-urls']);
    fetchCategories();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      icon: "",
      sort_order: categories.length,
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: ""
    });
    setEditingCategory(null);
    setDialogOpen(false);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      sort_order: category.sort_order,
      meta_title: category.meta_title || "",
      meta_description: category.meta_description || "",
      meta_keywords: category.meta_keywords || "",
      og_image: category.og_image || ""
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Categories Management</h2>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select game" />
            </SelectTrigger>
            <SelectContent>
              {games.map((game) => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-2xl max-h-[85vh] flex flex-col"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 pr-4 overflow-y-auto max-h-[60vh]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={async (e) => {
                      const newName = e.target.value;
                      setFormData(prev => ({ ...prev, name: newName }));
                      
                      // Auto-generate slug only when creating new category
                      if (!editingCategory && newName && selectedGameId) {
                        const autoSlug = await generateUniqueSlug(newName, editingCategory?.id);
                        setFormData(prev => ({ ...prev, slug: autoSlug }));
                      }
                    }}
                    placeholder="e.g., Top Sellers 👑"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-generated-from-name"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (formData.name) {
                          const newSlug = await generateUniqueSlug(formData.name, editingCategory?.id);
                          setFormData(prev => ({ ...prev, slug: newSlug }));
                          toast({ title: "Slug Generated", description: `New slug: ${newSlug}` });
                        }
                      }}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingCategory ? "⚠️ Changing slug will break existing links and SEO rankings" : "Slug is auto-generated from name"}
                  </p>
                </div>
                <div>
                  <Label htmlFor="icon">Icon (emoji or lucide icon name)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="e.g., 👑 or Trophy"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* SEO Settings */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4">SEO Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="meta_title">Meta Title</Label>
                      <Input
                        id="meta_title"
                        value={formData.meta_title}
                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                        placeholder="Custom SEO title (leave empty to auto-generate)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.meta_title.length}/60 chars • Recommended: 50-60 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <Textarea
                        id="meta_description"
                        value={formData.meta_description}
                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                        placeholder="Custom SEO description for search results"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.meta_description.length}/160 chars • Recommended: 150-160 characters
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="meta_keywords">Meta Keywords</Label>
                      <Input
                        id="meta_keywords"
                        value={formData.meta_keywords}
                        onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Comma-separated keywords for SEO
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="og_image">OG Image URL</Label>
                      <Input
                        id="og_image"
                        value={formData.og_image}
                        onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Social sharing thumbnail (1200x630px recommended)
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedGameId ? (
        <p className="text-muted-foreground">Please select a game to manage categories</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">Order: {category.sort_order}</span>
                </div>
                <CardTitle className="flex items-center gap-2">
                  {category.icon && <span>{category.icon}</span>}
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Slug: {category.slug}</p>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
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

export default CategoriesManager;