import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Search, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DeletedUrl {
  id: string;
  url_path: string;
  content_type: string;
  content_id: string | null;
  original_title: string | null;
  deleted_at: string;
  created_at: string | null;
  deleted_by: string | null;
}

const DeletedUrlsManager = () => {
  const [deletedUrls, setDeletedUrls] = useState<DeletedUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState({
    url_path: "",
    content_type: "product",
    original_title: ""
  });
  const { toast } = useToast();

  const fetchDeletedUrls = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('deleted_urls')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('content_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeletedUrls(data || []);
    } catch (error: any) {
      console.error('Error fetching deleted URLs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deleted URLs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedUrls();
  }, [filterType]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this URL from the deleted list?')) {
      return;
    }

    try {
      const { data: deletedEntry, error: fetchError } = await supabase
        .from('deleted_urls')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Best-effort restore of original content visibility.
      // This works when content rows still exist (soft-hidden state).
      let restoredEntity = false;
      if (deletedEntry?.content_id) {
        const nowIso = new Date().toISOString();
        if (deletedEntry.content_type === "product") {
          const { data: restoredRows, error: restoreError } = await supabase
            .from("products")
            .update({ is_active: true, updated_at: nowIso })
            .eq("id", deletedEntry.content_id)
            .select("id");
          if (restoreError) throw restoreError;
          restoredEntity = (restoredRows?.length ?? 0) > 0;
        } else if (deletedEntry.content_type === "category") {
          const { data: restoredRows, error: restoreError } = await supabase
            .from("categories")
            .update({ is_active: true, updated_at: nowIso })
            .eq("id", deletedEntry.content_id)
            .select("id");
          if (restoreError) throw restoreError;
          restoredEntity = (restoredRows?.length ?? 0) > 0;
        } else if (deletedEntry.content_type === "game") {
          const { data: restoredRows, error: restoreError } = await supabase
            .from("games")
            .update({ is_active: true, updated_at: nowIso })
            .eq("id", deletedEntry.content_id)
            .select("id");
          if (restoreError) throw restoreError;
          restoredEntity = (restoredRows?.length ?? 0) > 0;
        } else if (deletedEntry.content_type === "blog_post") {
          const { data: restoredRows, error: restoreError } = await supabase
            .from("blog_posts")
            .update({ is_published: true, updated_at: nowIso })
            .eq("id", deletedEntry.content_id)
            .select("id");
          if (restoreError) throw restoreError;
          restoredEntity = (restoredRows?.length ?? 0) > 0;
        }
      }

      const { error } = await supabase
        .from('deleted_urls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: restoredEntity
          ? "URL removed and content restored to active/published state"
          : "URL removed from deleted list",
      });

      await refreshAdminData(['/rest/v1/deleted_urls'], ['deleted-urls']);
      fetchDeletedUrls();
    } catch (error: any) {
      console.error('Error deleting URL:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete URL",
        variant: "destructive",
      });
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.url_path.trim()) {
      toast({
        title: "Error",
        description: "URL path is required",
        variant: "destructive",
      });
      return;
    }

    if (!newUrl.url_path.startsWith('/')) {
      toast({
        title: "Error",
        description: "URL path must start with /",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('deleted_urls')
        .insert({
          url_path: newUrl.url_path,
          content_type: newUrl.content_type,
          original_title: newUrl.original_title || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "URL added to deleted list",
      });

      await refreshAdminData(['/rest/v1/deleted_urls'], ['deleted-urls']);
      setIsAddDialogOpen(false);
      setNewUrl({ url_path: "", content_type: "product", original_title: "" });
      fetchDeletedUrls();
    } catch (error: any) {
      console.error('Error adding URL:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add URL",
        variant: "destructive",
      });
    }
  };

  const filteredUrls = deletedUrls.filter(url =>
    url.url_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    url.original_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'product': return 'default';
      case 'blog_post': return 'secondary';
      case 'game': return 'outline';
      case 'category': return 'destructive';
      default: return 'default';
    }
  };

  const getDisplayDeletedDate = (url: DeletedUrl) => {
    const deletedDate = new Date(url.deleted_at);
    const deletedDateValid = Number.isFinite(deletedDate.getTime()) && deletedDate.getUTCFullYear() > 1971;
    if (deletedDateValid) return deletedDate.toLocaleDateString();

    const createdDate = url.created_at ? new Date(url.created_at) : null;
    const createdDateValid = Boolean(
      createdDate && Number.isFinite(createdDate.getTime()) && createdDate.getUTCFullYear() > 1971,
    );
    if (createdDateValid && createdDate) return createdDate.toLocaleDateString();

    return "-";
  };

  const stats = {
    total: deletedUrls.length,
    products: deletedUrls.filter(u => u.content_type === 'product').length,
    blogPosts: deletedUrls.filter(u => u.content_type === 'blog_post').length,
    games: deletedUrls.filter(u => u.content_type === 'game').length,
    categories: deletedUrls.filter(u => u.content_type === 'category').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Deleted URLs (410 Gone)</h2>
        <p className="text-muted-foreground">
          Manage URLs that return 410 (Gone) status for better SEO
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products</CardDescription>
            <CardTitle className="text-3xl">{stats.products}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blog Posts</CardDescription>
            <CardTitle className="text-3xl">{stats.blogPosts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Games</CardDescription>
            <CardTitle className="text-3xl">{stats.games}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-3xl">{stats.categories}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search URLs or titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="product">Products</SelectItem>
                  <SelectItem value="blog_post">Blog Posts</SelectItem>
                  <SelectItem value="game">Games</SelectItem>
                  <SelectItem value="category">Categories</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchDeletedUrls} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add URL
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Deleted URL</DialogTitle>
                    <DialogDescription>
                      Manually add a URL to the deleted list to return 410 status
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="url_path">URL Path *</Label>
                      <Input
                        id="url_path"
                        placeholder="/game/wow/gold/mythic-boost"
                        value={newUrl.url_path}
                        onChange={(e) => setNewUrl({ ...newUrl, url_path: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content_type">Content Type *</Label>
                      <Select
                        value={newUrl.content_type}
                        onValueChange={(value) => setNewUrl({ ...newUrl, content_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="blog_post">Blog Post</SelectItem>
                          <SelectItem value="game">Game</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="original_title">Original Title (Optional)</Label>
                      <Input
                        id="original_title"
                        placeholder="e.g., Mythic+ Boost"
                        value={newUrl.original_title}
                        onChange={(e) => setNewUrl({ ...newUrl, original_title: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUrl}>Add URL</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredUrls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deleted URLs found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL Path</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Original Title</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUrls.map((url) => (
                    <TableRow key={url.id}>
                      <TableCell className="font-mono text-sm">{url.url_path}</TableCell>
                      <TableCell>
                        <Badge variant={getContentTypeBadgeVariant(url.content_type)}>
                          {url.content_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{url.original_title || '-'}</TableCell>
                      <TableCell>
                        {getDisplayDeletedDate(url)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(url.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About 410 Gone Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>410 vs 404:</strong> A 410 status tells search engines "this content is permanently gone" 
            while 404 means "not found, might come back". This helps with faster deindexing and better SEO.
          </p>
          <p>
            <strong>Automatic Tracking:</strong> When you delete products, blog posts, games, or categories, 
            their URLs are automatically added to this list.
          </p>
          <p>
            <strong>Manual Management:</strong> You can also manually add URLs that should return 410 status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletedUrlsManager;
