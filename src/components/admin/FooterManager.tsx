import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, GripVertical, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type FooterSection = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type FooterLink = {
  id: string;
  section_id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
};

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
};

const FooterManager = () => {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<FooterSection | null>(null);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [legalPages, setLegalPages] = useState<Array<{ title: string; slug: string }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sectionsRes, linksRes, socialRes, legalPagesRes] = await Promise.all([
        supabase.from("footer_sections").select("*").order("sort_order"),
        supabase.from("footer_links").select("*").order("sort_order"),
        supabase.from("social_links").select("*").order("sort_order"),
        supabase.from("blog_posts").select("title, slug").eq("is_published", true).eq("is_legal_page", true).order("title"),
      ]);

      if (sectionsRes.data) setSections(sectionsRes.data);
      if (linksRes.data) setLinks(linksRes.data);
      if (socialRes.data) setSocialLinks(socialRes.data);
      if (legalPagesRes.data) setLegalPages(legalPagesRes.data);
    } catch (error) {
      toast.error("Failed to load footer data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (section: Partial<FooterSection>) => {
    try {
      if (section.id) {
        await supabase.from("footer_sections").update(section).eq("id", section.id);
        toast.success("Section updated");
      } else {
        const { id, ...insertData } = section;
        await supabase.from("footer_sections").insert([insertData as any]);
        toast.success("Section created");
      }
      await refreshAdminData(['/rest/v1/footer_sections'], ['footer-sections']);
      fetchData();
      setEditingSection(null);
    } catch (error) {
      toast.error("Failed to save section");
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      await supabase.from("footer_sections").delete().eq("id", id);
      toast.success("Section deleted");
      await refreshAdminData(['/rest/v1/footer_sections'], ['footer-sections']);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete section");
    }
  };

  const handleSaveLink = async (link: Partial<FooterLink>) => {
    try {
      if (link.id) {
        await supabase.from("footer_links").update(link).eq("id", link.id);
        toast.success("Link updated");
      } else {
        const { id, ...insertData } = link;
        await supabase.from("footer_links").insert([insertData as any]);
        toast.success("Link created");
      }
      await refreshAdminData(['/rest/v1/footer_links'], ['footer-links']);
      fetchData();
      setEditingLink(null);
    } catch (error) {
      toast.error("Failed to save link");
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await supabase.from("footer_links").delete().eq("id", id);
      toast.success("Link deleted");
      await refreshAdminData(['/rest/v1/footer_links'], ['footer-links']);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete link");
    }
  };

  const handleSaveSocial = async (social: Partial<SocialLink>) => {
    try {
      if (social.id) {
        await supabase.from("social_links").update(social).eq("id", social.id);
        toast.success("Social link updated");
      } else {
        const { id, ...insertData } = social;
        await supabase.from("social_links").insert([insertData as any]);
        toast.success("Social link created");
      }
      await refreshAdminData(['/rest/v1/social_links'], ['social-links']);
      fetchData();
      setEditingSocial(null);
    } catch (error) {
      toast.error("Failed to save social link");
    }
  };

  const handleDeleteSocial = async (id: string) => {
    try {
      await supabase.from("social_links").delete().eq("id", id);
      toast.success("Social link deleted");
      await refreshAdminData(['/rest/v1/social_links'], ['social-links']);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete social link");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Tabs defaultValue="sections" className="w-full">
      <TabsList>
        <TabsTrigger value="sections">Footer Sections</TabsTrigger>
        <TabsTrigger value="links">Footer Links</TabsTrigger>
        <TabsTrigger value="legal">Legal Pages (Auto)</TabsTrigger>
        <TabsTrigger value="social">Social Links</TabsTrigger>
      </TabsList>

      <TabsContent value="sections" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Footer Sections</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingSection({ id: "", title: "", slug: "", sort_order: 0, is_active: true })}>
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSection?.id ? "Edit" : "Add"} Section</DialogTitle>
              </DialogHeader>
              <SectionForm section={editingSection} onSave={handleSaveSection} onCancel={() => setEditingSection(null)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  {section.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSection(section)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Section</DialogTitle>
                      </DialogHeader>
                      <SectionForm section={section} onSave={handleSaveSection} onCancel={() => setEditingSection(null)} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSection(section.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Slug: {section.slug} | Order: {section.sort_order} | Active: {section.is_active ? "Yes" : "No"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="links" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Footer Links</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLink({ id: "", section_id: "", label: "", url: "", sort_order: 0, is_active: true })}>
                <Plus className="w-4 h-4 mr-2" /> Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLink?.id ? "Edit" : "Add"} Link</DialogTitle>
              </DialogHeader>
              <LinkForm link={editingLink} sections={sections} onSave={handleSaveLink} onCancel={() => setEditingLink(null)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-sm">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {links.filter((l) => l.section_id === section.id).map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.url}</p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingLink(link)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Link</DialogTitle>
                          </DialogHeader>
                          <LinkForm link={link} sections={sections} onSave={handleSaveLink} onCancel={() => setEditingLink(null)} />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteLink(link.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="legal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Legal Pages (Auto-Generated)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                These pages are automatically added to the footer's Legal section when you create them as Legal Pages in the Blog Manager. 
                No manual action needed!
              </p>
              {legalPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No legal pages yet. Create them in Blog & Legal Pages section.</p>
              ) : (
                legalPages.map((page) => (
                  <div key={page.slug} className="flex items-center justify-between p-3 border rounded bg-muted/50">
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-xs text-muted-foreground">/blog/{page.slug}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/blog/${page.slug}`);
                        toast.success("Link copied!");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="social" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Social Links</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingSocial({ id: "", platform: "", url: "", icon_name: "", sort_order: 0, is_active: true })}>
                <Plus className="w-4 h-4 mr-2" /> Add Social Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSocial?.id ? "Edit" : "Add"} Social Link</DialogTitle>
              </DialogHeader>
              <SocialForm social={editingSocial} onSave={handleSaveSocial} onCancel={() => setEditingSocial(null)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {socialLinks.map((social) => (
            <Card key={social.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{social.platform}</p>
                  <p className="text-xs text-muted-foreground">{social.url}</p>
                  <p className="text-xs text-muted-foreground">Icon: {social.icon_name}</p>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSocial(social)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Social Link</DialogTitle>
                      </DialogHeader>
                      <SocialForm social={social} onSave={handleSaveSocial} onCancel={() => setEditingSocial(null)} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSocial(social.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

const SectionForm = ({ section, onSave, onCancel }: { section: FooterSection | null; onSave: (section: Partial<FooterSection>) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<FooterSection>>(section || {});

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      </div>
      <div>
        <Label>Slug</Label>
        <Input value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
      </div>
      <div>
        <Label>Sort Order</Label>
        <Input type="number" value={formData.sort_order || 0} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)}>Save</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

const LinkForm = ({ link, sections, onSave, onCancel }: { link: FooterLink | null; sections: FooterSection[]; onSave: (link: Partial<FooterLink>) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<FooterLink>>(link || {});

  return (
    <div className="space-y-4">
      <div>
        <Label>Section</Label>
        <select className="w-full p-2 border rounded" value={formData.section_id || ""} onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}>
          <option value="">Select Section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Label</Label>
        <Input value={formData.label || ""} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
      </div>
      <div>
        <Label>URL</Label>
        <Input value={formData.url || ""} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com or /page" />
        <p className="text-xs text-muted-foreground mt-1">
          ⚠️ Legal pages are AUTO-ADDED to footer when created in Blog Manager - don't add them manually here!
          <br/>For other links: /blog/post-slug for blog posts | https://example.com for external sites
        </p>
      </div>
      <div>
        <Label>Sort Order</Label>
        <Input type="number" value={formData.sort_order || 0} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)}>Save</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

const SocialForm = ({ social, onSave, onCancel }: { social: SocialLink | null; onSave: (social: Partial<SocialLink>) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState<Partial<SocialLink>>(social || {});

  return (
    <div className="space-y-4">
      <div>
        <Label>Platform</Label>
        <Input value={formData.platform || ""} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} />
      </div>
      <div>
        <Label>URL</Label>
        <Input value={formData.url || ""} onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
      </div>
      <div>
        <Label>Icon Name (Lucide)</Label>
        <Input value={formData.icon_name || ""} onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })} placeholder="Facebook, Instagram, Twitter, etc." />
      </div>
      <div>
        <Label>Sort Order</Label>
        <Input type="number" value={formData.sort_order || 0} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
        <Label>Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)}>Save</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default FooterManager;