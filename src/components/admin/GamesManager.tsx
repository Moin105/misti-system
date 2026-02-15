import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Image as ImageIcon, ChevronDown, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon_url: string | null;
  hero_image_url: string | null;
  hero_image_position: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  // Phase 1: Essential SEO fields
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  // Phase 2: Enhanced SEO fields
  game_platform: string | null;
  robots: string | null;
  canonical_url: string | null;
}

interface Genre {
  id: string;
  name: string;
  slug: string;
}

const GamesManager = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    icon_url: "",
    hero_image_url: "",
    hero_image_position: "center",
    is_popular: false,
    sort_order: 0,
    // Phase 1: Essential SEO fields
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    // Phase 2: Enhanced SEO fields
    game_platform: "",
    robots: "index,follow",
    canonical_url: ""
  });

  useEffect(() => {
    fetchGames();
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    const { data } = await supabase
      .from("game_genres")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) {
      setGenres(data);
    }
  };

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("is_popular", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive"
      });
    } else {
      setGames(data || []);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('game-images')
      .getPublicUrl(filePath);

    setFormData({ ...formData, image_url: publicUrl });
    setUploading(false);
    toast({
      title: "Success",
      description: "Image uploaded successfully"
    });
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `hero-${Math.random()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload hero image",
        variant: "destructive"
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('game-images')
      .getPublicUrl(filePath);

    setFormData({ ...formData, hero_image_url: publicUrl });
    setUploading(false);
    toast({
      title: "Success",
      description: "Hero image uploaded successfully"
    });
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `icon-${Math.random()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('game-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload icon",
        variant: "destructive"
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('game-images')
      .getPublicUrl(filePath);

    setFormData({ ...formData, icon_url: publicUrl });
    setUploading(false);
    toast({
      title: "Success",
      description: "Icon uploaded successfully"
    });
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const checkSlugExists = async (slug: string, excludeId?: string): Promise<boolean> => {
    let query = supabase.from("games").select("id").eq("slug", slug);
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
      const randomId = Math.floor(1000 + Math.random() * 9000);
      slug = `${slug}-${randomId}`;
    }
    return slug;
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

    if (editingGame) {
      const { error } = await supabase
        .from("games")
        .update({
          name: formData.name,
          slug: formData.slug.trim().toLowerCase(),
          description: formData.description || null,
          image_url: formData.image_url || null,
          icon_url: formData.icon_url || null,
          hero_image_url: formData.hero_image_url || null,
          hero_image_position: formData.hero_image_position || "center",
          is_popular: formData.is_popular,
          sort_order: formData.sort_order,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          meta_keywords: formData.meta_keywords || null,
          og_image: formData.og_image || null,
          game_platform: formData.game_platform || null,
          robots: formData.robots || "index,follow",
          canonical_url: formData.canonical_url || null
        })
        .eq("id", editingGame.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update game",
          variant: "destructive"
        });
      } else {
        // Update genre assignments
        await updateGenreAssignments(editingGame.id);
        
        toast({
          title: "Success",
          description: "Game updated successfully"
        });
        await refreshAdminData(['/rest/v1/games'], ['games']);
        fetchGames();
        resetForm();
      }
    } else {
      const { data: newGame, error } = await supabase
        .from("games")
        .insert({
          name: formData.name,
          slug: formData.slug.trim().toLowerCase(),
          description: formData.description || null,
          image_url: formData.image_url || null,
          icon_url: formData.icon_url || null,
          hero_image_url: formData.hero_image_url || null,
          hero_image_position: formData.hero_image_position || "center",
          is_popular: formData.is_popular,
          sort_order: formData.sort_order,
          is_active: true,
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          meta_keywords: formData.meta_keywords || null,
          og_image: formData.og_image || null,
          game_platform: formData.game_platform || null,
          robots: formData.robots || "index,follow",
          canonical_url: formData.canonical_url || null
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create game",
          variant: "destructive"
        });
      } else if (newGame) {
        // Add genre assignments
        await updateGenreAssignments(newGame.id);
        
        toast({
          title: "Success",
          description: "Game created successfully"
        });
        await refreshAdminData(['/rest/v1/games'], ['games']);
        fetchGames();
        resetForm();
      }
    }
  };

  const updateGenreAssignments = async (gameId: string) => {
    // Delete existing assignments
    await supabase
      .from("game_genre_assignments")
      .delete()
      .eq("game_id", gameId);

    // Insert new assignments
    if (selectedGenres.length > 0) {
      const assignments = selectedGenres.map(genreId => ({
        game_id: gameId,
        genre_id: genreId
      }));

      await supabase
        .from("game_genre_assignments")
        .insert(assignments);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this game?")) return;

    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Game deleted successfully"
      });
      await refreshAdminData(['/rest/v1/games'], ['games']);
      fetchGames();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      icon_url: "",
      hero_image_url: "",
      hero_image_position: "center",
      is_popular: false,
      sort_order: 0,
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      og_image: "",
      game_platform: "",
      robots: "index,follow",
      canonical_url: ""
    });
    setSelectedGenres([]);
    setEditingGame(null);
    setDialogOpen(false);
  };

  const openEditDialog = async (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      slug: game.slug,
      description: game.description || "",
      image_url: game.image_url || "",
      icon_url: game.icon_url || "",
      hero_image_url: game.hero_image_url || "",
      hero_image_position: game.hero_image_position || "center",
      is_popular: game.is_popular || false,
      sort_order: game.sort_order,
      meta_title: game.meta_title || "",
      meta_description: game.meta_description || "",
      meta_keywords: game.meta_keywords || "",
      og_image: game.og_image || "",
      game_platform: game.game_platform || "",
      robots: game.robots || "index,follow",
      canonical_url: game.canonical_url || ""
    });

    // Fetch existing genre assignments
    const { data: assignments } = await supabase
      .from("game_genre_assignments")
      .select("genre_id")
      .eq("game_id", game.id);

    if (assignments) {
      setSelectedGenres(assignments.map(a => a.genre_id));
    }

    setDialogOpen(true);
  };

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
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
        <h2 className="text-2xl font-bold">Games Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Game
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] flex flex-col"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{editingGame ? "Edit Game" : "Add New Game"}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[calc(90vh-140px)] pr-4">
              <form id="game-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={async (e) => {
                      const newName = e.target.value;
                      setFormData(prev => ({ ...prev, name: newName }));
                      
                      // Auto-generate slug only when creating new game
                      if (!editingGame && newName) {
                        const autoSlug = await generateUniqueSlug(newName);
                        setFormData(prev => ({ ...prev, slug: autoSlug }));
                      }
                    }}
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
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (formData.name) {
                          const newSlug = await generateUniqueSlug(formData.name, editingGame?.id);
                          setFormData(prev => ({ ...prev, slug: newSlug }));
                          toast({ title: "Slug Generated", description: `New slug: ${newSlug}` });
                        }
                      }}
                    >
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingGame ? "⚠️ Changing slug will break existing links and SEO rankings" : "Slug is auto-generated from name"}
                  </p>
                </div>
                
                {/* Popular Toggle */}
                <div className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2">
                  <div className="mr-4">
                    <Label htmlFor="is_popular" className="flex flex-col gap-1">
                      <span className="text-xs font-semibold bg-gradient-to-r from-[hsl(220,70%,65%)] to-[hsl(220,70%,55%)] bg-clip-text text-transparent">
                        Feature in Popular Gaming Services
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, this game appears in the "Popular Gaming Services" section and is hidden from "More Games Available".
                    </p>
                  </div>
                  <Switch
                    id="is_popular"
                    checked={formData.is_popular}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_popular: checked }))
                    }
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
                  <Label htmlFor="icon">Game Icon</Label>
                  <p className="text-xs text-muted-foreground mb-2">Small icon/logo used in game cards (80x80px recommended, transparent background works best)</p>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="icon"
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.icon_url && (
                    <div className="mt-2">
                      <div className="w-20 h-20 flex items-center justify-center bg-card/50 rounded border border-border/30">
                        <img src={formData.icon_url} alt="Icon preview" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="image">Game Card Image (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Legacy: Used in breadcrumbs and SEO. Icon is preferred for cards.</p>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <img src={formData.image_url} alt="Game card preview" className="w-32 h-32 object-cover rounded" />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="hero-image">Hero Background Image</Label>
                  <p className="text-xs text-muted-foreground mb-2">Used as the background in the hero section (1920x400px recommended)</p>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="hero-image"
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.hero_image_url && (
                    <div className="mt-2 space-y-3">
                      <img src={formData.hero_image_url} alt="Hero background preview" className="w-full h-24 object-cover rounded" />
                      
                      <div className="space-y-2">
                        <Label htmlFor="hero-position">Image Position</Label>
                        <Select
                          value={formData.hero_image_position}
                          onValueChange={(value) => setFormData({ ...formData, hero_image_position: value })}
                        >
                          <SelectTrigger id="hero-position">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose how the hero image is positioned vertically
                        </p>
                      </div>
                    </div>
                  )}
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
                <div>
                  <Label>Genres</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {genres.map((genre) => (
                      <div key={genre.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`genre-${genre.id}`}
                          checked={selectedGenres.includes(genre.id)}
                          onCheckedChange={() => toggleGenre(genre.id)}
                        />
                        <label
                          htmlFor={`genre-${genre.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {genre.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO Settings Section */}
                <Collapsible className="border rounded-lg p-4 space-y-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">SEO Settings</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="meta_title">Meta Title</Label>
                      <Input
                        id="meta_title"
                        value={formData.meta_title}
                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                        placeholder={`${formData.name || 'Game'} Services | misti.services`}
                        maxLength={60}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.meta_title.length}/60 characters. Leave blank for auto-generated.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <Textarea
                        id="meta_description"
                        value={formData.meta_description}
                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                        placeholder={`Browse all ${formData.name || 'game'} boost services. Professional gaming services with 24/7 support.`}
                        maxLength={160}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.meta_description.length}/160 characters. Ideal: 150-160 chars.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="meta_keywords">Meta Keywords</Label>
                      <Input
                        id="meta_keywords"
                        value={formData.meta_keywords}
                        onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                        placeholder={`${formData.name || 'game'}, boost, services, professional`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Comma-separated keywords for search engines.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="og_image">OG Image URL (Social Sharing)</Label>
                      <Input
                        id="og_image"
                        value={formData.og_image}
                        onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                        placeholder="Leave blank to use game image"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Image shown when shared on social media (1200x630px recommended).
                      </p>
                    </div>

                    {/* Phase 2: Enhanced SEO Fields */}
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-4">Advanced SEO Settings</p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="game_platform">Game Platforms</Label>
                          <Input
                            id="game_platform"
                            value={formData.game_platform}
                            onChange={(e) => setFormData({ ...formData, game_platform: e.target.value })}
                            placeholder="PC, PlayStation, Xbox, Mobile"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Comma-separated platforms. Used in VideoGame schema for rich results.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="robots">Robots Directive</Label>
                          <Select
                            value={formData.robots}
                            onValueChange={(value) => setFormData({ ...formData, robots: value })}
                          >
                            <SelectTrigger id="robots">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="index,follow">index,follow (Default)</SelectItem>
                              <SelectItem value="noindex,follow">noindex,follow</SelectItem>
                              <SelectItem value="index,nofollow">index,nofollow</SelectItem>
                              <SelectItem value="noindex,nofollow">noindex,nofollow</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Controls how search engines index this page.
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="canonical_url">Canonical URL</Label>
                          <Input
                            id="canonical_url"
                            value={formData.canonical_url}
                            onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                            placeholder="Leave blank for default (/game/slug)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Override canonical URL if this game has multiple access paths.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </form>
            </ScrollArea>
            <div className="pt-4 border-t">
              <Button type="submit" form="game-form" className="w-full">
                {editingGame ? "Update Game" : "Create Game"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Card key={game.id}>
            <CardHeader>
              {game.image_url ? (
                <img src={game.image_url} alt={game.name} className="w-full h-48 object-cover rounded-lg mb-4" />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center rounded-lg mb-4">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="flex items-center gap-2">
                {game.name}
                {game.is_popular && (
                  <Badge
                    variant="accent"
                    className="text-[10px] font-semibold bg-gradient-to-r from-[hsl(220,70%,65%)] to-[hsl(220,70%,55%)] text-white border-none px-2 py-0.5"
                  >
                    Popular
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{game.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              {game.description && (
                <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(game)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(game.id)}
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

export default GamesManager;