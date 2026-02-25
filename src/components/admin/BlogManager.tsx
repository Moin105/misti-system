import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Copy, ExternalLink, FileText, Image, Tag, Clock, User, Gamepad2, Trophy, Users, Zap, Shield, Sparkles, Heart, Target, Award } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  featured_image: string | null;
  author_name: string | null;
  read_time_minutes: number;
  canonical_url: string | null;
  is_legal_page: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
  blog_categories?: {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon_name: string;
  } | null;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon_name?: string | null;
}

const BlogManager = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    meta_description: "",
    meta_keywords: "",
    featured_image: "",
    author_name: "",
    read_time_minutes: 5,
    canonical_url: "",
    is_legal_page: false,
    is_published: false,
    category_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("blog_categories")
      .select("id, name, slug, color")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    
    setCategories(data || []);
  };

  const fetchPosts = async () => {
    const [postsRes, categoriesRes] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("blog_categories")
        .select("id, name, slug, color, icon_name"),
    ]);

    if (postsRes.error) {
      toast({
        title: "Error fetching posts",
        description: postsRes.error.message,
        variant: "destructive",
      });
    } else {
      const categoryMap = new Map((categoriesRes.data || []).map((cat) => [cat.id, cat]));
      const enrichedPosts = (postsRes.data || []).map((post) => ({
        ...post,
        blog_categories: post.category_id ? categoryMap.get(post.category_id) || null : null,
      }));
      setPosts(enrichedPosts as BlogPost[]);
    }
    setLoading(false);
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const normalizeSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const readTime = estimateReadTime(formData.content);
    const normalizedSlug = normalizeSlug(formData.slug || formData.title);

    if (!normalizedSlug) {
      toast({
        title: "Invalid slug",
        description: "Please enter a valid title or slug.",
        variant: "destructive",
      });
      return;
    }
    
    const postData = {
      title: formData.title,
      slug: normalizedSlug,
      content: formData.content,
      excerpt: formData.excerpt || null,
      meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      featured_image: formData.featured_image || null,
      author_name: formData.author_name || null,
      read_time_minutes: readTime,
      canonical_url: formData.canonical_url || null,
      is_legal_page: formData.is_legal_page,
      is_published: formData.is_published,
      published_at: formData.is_published && !editingPost?.is_published ? new Date().toISOString() : editingPost?.published_at,
      category_id: formData.category_id || null,
    };

    if (editingPost) {
      const { error } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", editingPost.id);

      if (error) {
        toast({
          title: "Error updating post",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ 
          title: formData.is_published ? "Post updated successfully" : "Draft saved",
          description: formData.is_published ? `Live at /blog/${normalizedSlug}` : "Enable Published to make this page public.",
        });
        await refreshAdminData(['/rest/v1/blog_posts'], ['blog-posts']);
        resetForm();
        fetchPosts();
      }
    } else {
      const { error } = await supabase
        .from("blog_posts")
        .insert([postData]);

      if (error) {
        toast({
          title: "Error creating post",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ 
          title: formData.is_published ? "Post created successfully" : "Draft saved",
          description: formData.is_published ? `Live at /blog/${normalizedSlug}` : "Enable Published to create a public page.",
        });
        await refreshAdminData(['/rest/v1/blog_posts'], ['blog-posts']);
        resetForm();
        fetchPosts();
      }
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      meta_description: post.meta_description || "",
      meta_keywords: post.meta_keywords || "",
      featured_image: post.featured_image || "",
      author_name: post.author_name || "",
      read_time_minutes: post.read_time_minutes || 5,
      canonical_url: post.canonical_url || "",
      is_legal_page: post.is_legal_page,
      is_published: post.is_published,
      category_id: post.category_id || "",
    });
  };

  const handleDelete = async (id: string) => {
    const nowIso = new Date().toISOString();
    const { data: post, error: postFetchError } = await supabase
      .from("blog_posts")
      .select("id, title")
      .eq("id", id)
      .single();

    if (postFetchError) {
      toast({
        title: "Error deleting post",
        description: postFetchError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: blogUrl, error: urlError } = await supabase.rpc("get_blog_post_url", {
      post_id: id,
    });
    if (urlError) {
      toast({
        title: "Error deleting post",
        description: "Failed to resolve blog URL",
        variant: "destructive",
      });
      return;
    }

    const { error: softDeleteError } = await supabase
      .from("blog_posts")
      .update({
        is_published: false,
        updated_at: nowIso,
      })
      .eq("id", id);

    if (softDeleteError) {
      toast({
        title: "Error deleting post",
        description: softDeleteError.message,
        variant: "destructive",
      });
      return;
    }

    if (blogUrl) {
      const { error: deletedUrlError } = await supabase
        .from("deleted_urls")
        .upsert(
          {
            url_path: blogUrl,
            content_type: "blog_post",
            content_id: id,
            original_title: post?.title ?? null,
            deleted_at: nowIso,
            created_at: nowIso,
          },
          { onConflict: "url_path" },
        );
      if (deletedUrlError) {
        console.error("Failed adding blog URL to deleted list:", deletedUrlError);
      }
    }

    toast({ title: "Post moved to 410 deleted URLs list" });
    await refreshAdminData(['/rest/v1/blog_posts', '/rest/v1/deleted_urls'], ['blog-posts', 'deleted-urls']);
    fetchPosts();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      meta_description: "",
      meta_keywords: "",
      featured_image: "",
      author_name: "",
      read_time_minutes: 5,
      canonical_url: "",
      is_legal_page: false,
      is_published: false,
      category_id: "",
    });
    setEditingPost(null);
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const openInNewTab = (slug: string) => {
    window.open(`/blog/${slug}`, '_blank');
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {editingPost ? "Edit Post" : "Create New Post"}
          </CardTitle>
          <CardDescription>
            {editingPost ? "Update the blog post with SEO optimization" : "Create a new SEO-optimized blog post or legal page"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO Settings</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Organize posts into categories for better navigation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData({ 
                        ...formData, 
                        title: newTitle,
                        slug: !editingPost ? generateSlug(newTitle) : formData.slug
                      });
                    }}
                    placeholder="Enter an SEO-friendly title (50-60 characters)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.title.length}/60 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="url-friendly-slug"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Preview: {window.location.origin}/blog/{formData.slug || "your-slug"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Brief summary shown in listings (150-160 characters)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.excerpt.length}/160 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estimated read time: {estimateReadTime(formData.content)} min
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_description" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Meta Description
                  </Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Description for search engines (150-160 characters)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.meta_description.length}/160 characters - Appears in search results
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_keywords" className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Meta Keywords
                  </Label>
                  <Input
                    id="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords for SEO
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featured_image" className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Featured Image URL
                  </Label>
                  <Input
                    id="featured_image"
                    value={formData.featured_image}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Hero image for social sharing and search results
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canonical_url">Canonical URL</Label>
                  <Input
                    id="canonical_url"
                    value={formData.canonical_url}
                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                    placeholder="https://example.com/original-article"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Use if this content was published elsewhere first
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author_name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Author Name
                  </Label>
                  <Input
                    id="author_name"
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps with E-E-A-T (Experience, Expertise, Authoritativeness, Trust)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_legal_page"
                        checked={formData.is_legal_page}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_legal_page: checked })}
                      />
                      <Label htmlFor="is_legal_page">Legal Page</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Legal pages automatically appear in the footer&apos;s Legal section when published
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label htmlFor="is_published">Published</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit">
                {editingPost ? "Update Post" : "Create Post"}
              </Button>
              {editingPost && (
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
          <CardTitle>All Posts</CardTitle>
          <CardDescription>Manage your blog posts and legal pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {post.featured_image && (
                      <img 
                        src={post.featured_image} 
                        alt={post.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{post.title}</h3>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                          /blog/{post.slug}
                        </p>
                        {post.author_name && (
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            {post.author_name}
                          </span>
                        )}
                        {post.read_time_minutes && (
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {post.read_time_minutes} min read
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(post.slug)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        {post.is_published && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInNewTab(post.slug)}
                            className="h-6 px-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {/* Category Badge */}
                        {post.category_id && post.blog_categories ? (
                          <span 
                            className="text-xs px-2 py-1 rounded flex items-center gap-1"
                            style={{ 
                              backgroundColor: `${post.blog_categories.color}20`,
                              color: post.blog_categories.color 
                            }}
                          >
                            {post.blog_categories.icon_name === 'Gamepad2' && <Gamepad2 className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Trophy' && <Trophy className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Users' && <Users className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Zap' && <Zap className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Shield' && <Shield className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Sparkles' && <Sparkles className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Heart' && <Heart className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Target' && <Target className="w-3 h-3" />}
                            {post.blog_categories.icon_name === 'Award' && <Award className="w-3 h-3" />}
                            {post.blog_categories.name}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                            Uncategorized
                          </span>
                        )}
                        {post.is_legal_page && (
                          <span className="text-xs px-2 py-1 bg-secondary rounded">Legal Page</span>
                        )}
                        {post.is_published ? (
                          <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">Published</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-muted rounded">Draft</span>
                        )}
                        {post.meta_description && (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 rounded">SEO Optimized</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(post)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{post.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(post.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogManager;