import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Genre {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

const GenresManager = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    const { data, error } = await supabase
      .from("game_genres")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch genres",
        variant: "destructive"
      });
    } else {
      setGenres(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      toast({
        title: "Error",
        description: "Name and slug are required",
        variant: "destructive"
      });
      return;
    }

    if (editingGenre) {
      const { error } = await supabase
        .from("game_genres")
        .update({
          name: formData.name,
          slug: formData.slug,
          is_active: formData.is_active,
          sort_order: formData.sort_order
        })
        .eq("id", editingGenre.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update genre",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Genre updated successfully"
        });
        await refreshAdminData(['/rest/v1/game_genres'], ['game-genres']);
        fetchGenres();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("game_genres")
        .insert({
          name: formData.name,
          slug: formData.slug,
          is_active: formData.is_active,
          sort_order: formData.sort_order
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create genre",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Genre created successfully"
        });
        await refreshAdminData(['/rest/v1/game_genres'], ['game-genres']);
        fetchGenres();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this genre?")) return;

    const { error } = await supabase
      .from("game_genres")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete genre",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Genre deleted successfully"
      });
      await refreshAdminData(['/rest/v1/game_genres'], ['game-genres']);
      fetchGenres();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      is_active: true,
      sort_order: 0
    });
    setEditingGenre(null);
    setDialogOpen(false);
  };

  const openEditDialog = (genre: Genre) => {
    setEditingGenre(genre);
    setFormData({
      name: genre.name,
      slug: genre.slug,
      is_active: genre.is_active,
      sort_order: genre.sort_order
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
        <h2 className="text-2xl font-bold">Game Genres Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Genre
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{editingGenre ? "Edit Genre" : "Add New Genre"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., MMO, Action RPG"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., mmo, action-rpg"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingGenre ? "Update Genre" : "Create Genre"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {genres.map((genre) => (
          <Card key={genre.id} className={!genre.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Tag className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle>{genre.name}</CardTitle>
              <CardDescription>{genre.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Order: {genre.sort_order}</span>
                {genre.is_active ? (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">Active</span>
                ) : (
                  <span className="text-xs bg-gray-500/10 text-gray-500 px-2 py-1 rounded">Inactive</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(genre)}
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(genre.id)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GenresManager;
