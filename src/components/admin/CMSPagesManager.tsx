import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Edit } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: ContentBlock[];
  is_published: boolean;
  sort_order: number;
}

interface ContentBlock {
  type: string;
  heading?: string;
  subheading?: string;
  description?: string;
  content?: string;
  items?: any[];
}

const normalizeContentBlocks = (rawContent: unknown): ContentBlock[] => {
  if (!rawContent) return [];

  let parsed = rawContent;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is ContentBlock => !!item && typeof item === "object");
  }

  if (parsed && typeof parsed === "object") {
    return [parsed as ContentBlock];
  }

  return [];
};

export const CMSPagesManager = () => {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      const normalizedPages = ((data || []) as any[]).map((page) => ({
        ...page,
        content: normalizeContentBlocks(page?.content),
      }));
      setPages(normalizedPages as CMSPage[]);
    } catch (error) {
      console.error("Error fetching pages:", error);
      toast.error("Failed to load CMS Pages");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage) return;

    try {
      const { error } = await supabase
        .from("cms_pages")
        .update({
          title: editingPage.title,
          subtitle: editingPage.subtitle,
          content: editingPage.content as any,
          is_published: editingPage.is_published,
        })
        .eq("id", editingPage.id);

      if (error) throw error;
      
      toast.success("Page updated successfully");
      await refreshAdminData(['/rest/v1/cms_pages'], ['cms-pages']);
      setIsDialogOpen(false);
      fetchPages();
    } catch (error) {
      console.error("Error updating page:", error);
      toast.error("Failed to update page");
    }
  };

  const updateContentBlock = (index: number, updates: Partial<ContentBlock>) => {
    if (!editingPage) return;
    const newContent = [...editingPage.content];
    newContent[index] = { ...newContent[index], ...updates };
    setEditingPage({ ...editingPage, content: newContent });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">CMS Pages</h2>
          <p className="text-muted-foreground">Manage About Us and Contact Us pages</p>
        </div>
      </div>

      <div className="grid gap-6">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{page.title}</CardTitle>
                  <CardDescription>{page.subtitle}</CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">Slug: /{page.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                  <Dialog open={isDialogOpen && editingPage?.id === page.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingPage(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPage(page)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent 
                      className="max-w-4xl max-h-[90vh] overflow-y-auto"
                      onInteractOutside={(e) => e.preventDefault()}
                    >
                      <DialogHeader>
                        <DialogTitle>Edit {page.title}</DialogTitle>
                      </DialogHeader>
                      {editingPage && (
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={editingPage.title}
                              onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Subtitle</Label>
                            <Input
                              value={editingPage.subtitle || ""}
                              onChange={(e) => setEditingPage({ ...editingPage, subtitle: e.target.value })}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editingPage.is_published}
                              onCheckedChange={(checked) => setEditingPage({ ...editingPage, is_published: checked })}
                            />
                            <Label>Published</Label>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Content Blocks</h3>
                            {normalizeContentBlocks(editingPage.content).map((block, index) => (
                              <Card key={index}>
                                <CardHeader>
                                  <CardTitle className="text-sm">{block.type.toUpperCase()}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {block.heading !== undefined && (
                                    <div className="space-y-2">
                                      <Label>Heading</Label>
                                      <Input
                                        value={block.heading}
                                        onChange={(e) => updateContentBlock(index, { heading: e.target.value })}
                                      />
                                    </div>
                                  )}
                                  {block.subheading !== undefined && (
                                    <div className="space-y-2">
                                      <Label>Subheading</Label>
                                      <Input
                                        value={block.subheading}
                                        onChange={(e) => updateContentBlock(index, { subheading: e.target.value })}
                                      />
                                    </div>
                                  )}
                                  {block.description !== undefined && (
                                    <div className="space-y-2">
                                      <Label>Description</Label>
                                      <RichTextEditor
                                        value={block.description}
                                        onChange={(value) => updateContentBlock(index, { description: value })}
                                        rows={3}
                                      />
                                    </div>
                                  )}
                                  {block.content !== undefined && (
                                    <div className="space-y-2">
                                      <Label>Content</Label>
                                      <RichTextEditor
                                        value={block.content}
                                        onChange={(value) => updateContentBlock(index, { content: value })}
                                        rows={4}
                                      />
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSave}>
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
