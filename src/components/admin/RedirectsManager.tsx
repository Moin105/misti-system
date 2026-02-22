import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowRight, Activity, ExternalLink, TestTube, CheckCircle2, XCircle, Info, HelpCircle } from "lucide-react";
import { format } from "date-fns";

interface UrlRedirect {
  id: string;
  source_path: string;
  destination_path: string;
  is_pattern: boolean;
  status_code: number | null;
  is_active: boolean;
  hit_count: number | null;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
}

interface RedirectFormData {
  source_path: string;
  destination_path: string;
  is_pattern: boolean;
  status_code: number;
  is_active: boolean;
  notes: string;
}

const defaultFormData: RedirectFormData = {
  source_path: "",
  destination_path: "",
  is_pattern: false,
  status_code: 301,
  is_active: true,
  notes: "",
};

const REDIRECT_TEMPLATES = [
  {
    name: "Exact Page Redirect",
    description: "Redirect one specific URL to another",
    source: "/old-page",
    destination: "/new-page",
    isPattern: false,
    example: "/about-us → /about",
  },
  {
    name: "Prefix Redirect (Keep Subpaths)",
    description: "Redirect a whole section, preserving paths after",
    source: "/old-section(/.*)?$",
    destination: "/new-section$1",
    isPattern: true,
    example: "/old-section/page → /new-section/page",
  },
  {
    name: "Game Route Migration",
    description: "Redirect game URL with all subpaths",
    source: "/game/old-game-name(/.*)?$",
    destination: "/game/new-game-name$1",
    isPattern: true,
    example: "/game/old-name/gold → /game/new-name/gold",
  },
  {
    name: "Remove Trailing Slash",
    description: "Redirect URLs with trailing slash to without",
    source: "^(.+)/$",
    destination: "$1",
    isPattern: true,
    example: "/page/ → /page",
  },
];

export default function RedirectsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<UrlRedirect | null>(null);
  const [formData, setFormData] = useState<RedirectFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [testPath, setTestPath] = useState("");
  const [testResult, setTestResult] = useState<{ matched: boolean; destination?: string; statusCode?: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Fetch redirects
  const { data: redirects = [], isLoading } = useQuery({
    queryKey: ["url-redirects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("url_redirects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as UrlRedirect[];
    },
  });

  // Create redirect
  const createMutation = useMutation({
    mutationFn: async (data: RedirectFormData) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user?.id) {
        throw new Error("Authentication required. Please log in again.");
      }

      // Early guard for better UX when role/session drift exists.
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionData.session.user.id);
      if (roleError) throw roleError;
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      if (!isAdmin) {
        throw new Error("Admin role required to create redirects.");
      }

      const { error } = await supabase.from("url_redirects").insert({
        ...data,
        created_by: sessionData.session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["url-redirects"] });
      toast.success("Redirect created successfully");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create redirect");
    },
  });

  // Update redirect
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RedirectFormData> }) => {
      const { error } = await supabase
        .from("url_redirects")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["url-redirects"] });
      toast.success("Redirect updated successfully");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update redirect");
    },
  });

  // Delete redirect
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("url_redirects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["url-redirects"] });
      toast.success("Redirect deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete redirect");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("url_redirects")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["url-redirects"] });
      toast.success("Redirect status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRedirect(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (redirect: UrlRedirect) => {
    setEditingRedirect(redirect);
    setFormData({
      source_path: redirect.source_path,
      destination_path: redirect.destination_path,
      is_pattern: redirect.is_pattern,
      status_code: redirect.status_code,
      is_active: redirect.is_active,
      notes: redirect.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate source path starts with /
    if (!formData.source_path.startsWith("/") && !formData.source_path.startsWith("^")) {
      toast.error("Source path must start with / or ^ (for regex)");
      return;
    }

    // Validate $1 usage
    if (formData.destination_path.includes("$1") && !formData.is_pattern) {
      toast.error("Using $1 in destination requires 'Regex Pattern' to be enabled");
      return;
    }

    if (formData.destination_path.includes("$1") && formData.is_pattern && !formData.source_path.includes("(")) {
      toast.error("Using $1 in destination requires a capture group (...) in source pattern");
      return;
    }

    if (editingRedirect) {
      updateMutation.mutate({ id: editingRedirect.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTestRedirect = () => {
    if (!testPath) {
      toast.error("Enter a path to test");
      return;
    }

    const normalizedTestPath = testPath.startsWith("/") ? testPath : `/${testPath}`;
    
    // Find matching redirect
    const match = redirects.find((r) => {
      if (!r.is_active) return false;
      
      if (r.is_pattern) {
        try {
          const regex = new RegExp(r.source_path);
          return regex.test(normalizedTestPath);
        } catch {
          return false;
        }
      }
      return r.source_path === normalizedTestPath;
    });

    if (match) {
      let destination = match.destination_path;
      if (match.is_pattern) {
        try {
          const regex = new RegExp(match.source_path);
          destination = normalizedTestPath.replace(regex, match.destination_path);
        } catch {
          // Use original destination if regex fails
        }
      }
      setTestResult({ matched: true, destination, statusCode: match.status_code });
    } else {
      setTestResult({ matched: false });
    }
  };

  const applyTemplate = (template: typeof REDIRECT_TEMPLATES[0]) => {
    setFormData({
      ...formData,
      source_path: template.source,
      destination_path: template.destination,
      is_pattern: template.isPattern,
    });
    toast.success(`Template "${template.name}" applied. Modify as needed.`);
  };

  // Filter redirects
  const filteredRedirects = redirects.filter((r) => {
    const matchesSearch = 
      r.source_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesFilter = 
      filterActive === "all" || 
      (filterActive === "active" && r.is_active) ||
      (filterActive === "inactive" && !r.is_active);

    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalRedirects = redirects.length;
  const activeRedirects = redirects.filter((r) => r.is_active).length;
  const totalHits = redirects.reduce((sum, r) => sum + (r.hit_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redirects</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedirects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Redirects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRedirects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hits</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHits.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works Section */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowHelp(!showHelp)}>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5" />
            How Redirects Work
            <Badge variant="outline" className="ml-auto">{showHelp ? "Hide" : "Show"}</Badge>
          </CardTitle>
        </CardHeader>
        {showHelp && (
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Client-Side Redirects</AlertTitle>
              <AlertDescription>
                Redirects are handled client-side using JavaScript. When a user visits a URL that matches a redirect rule,
                they are instantly redirected to the destination. This works on both the preview and published site.
              </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">✅ How to Test</h4>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  <li>Use the "Test Redirect" tool below</li>
                  <li>Visit the old URL on your published site</li>
                  <li>Check the "Hits" column increments</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">📊 Hit Counting</h4>
                <p className="text-sm text-muted-foreground">
                  Each redirect tracks how many times it's been used. The hit count updates
                  automatically when users are redirected.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">⚡ Performance</h4>
              <p className="text-sm text-muted-foreground">
                Redirect rules are cached on the server for fast lookups. Users experience instant redirects
                without noticeable delay.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Test Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TestTube className="h-5 w-5" />
            Test Redirect
          </CardTitle>
          <CardDescription>Test which rule matches a path</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                placeholder="/old-page"
                onKeyDown={(e) => e.key === "Enter" && handleTestRedirect()}
              />
            </div>
            <Button onClick={handleTestRedirect}>Test</Button>
          </div>
          {testResult && (
            <div className={`mt-4 p-3 rounded-lg ${testResult.matched ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
              {testResult.matched ? (
                <div className="text-green-800">
                  <span className="font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Match found!
                  </span>
                  <div className="mt-1">
                    Redirects to: <code className="bg-green-100 px-1 rounded">{testResult.destination}</code>
                    <Badge variant="outline" className="ml-2">{testResult.statusCode}</Badge>
                  </div>
                </div>
              ) : (
                <div className="text-yellow-800">
                  <span className="font-medium flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> No match found
                  </span>
                  <div className="mt-1 text-sm">This path will not be redirected</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>URL Redirects</CardTitle>
              <CardDescription>Manage 301/302 redirects for your site</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingRedirect(null); setFormData(defaultFormData); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Redirect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRedirect ? "Edit Redirect" : "Add Redirect"}</DialogTitle>
                  <DialogDescription>
                    Configure a URL redirect rule
                  </DialogDescription>
                </DialogHeader>

                {/* Templates */}
                {!editingRedirect && (
                  <Accordion type="single" collapsible className="mb-4">
                    <AccordionItem value="templates">
                      <AccordionTrigger className="text-sm">Quick Templates</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-2">
                          {REDIRECT_TEMPLATES.map((template, i) => (
                            <div 
                              key={i}
                              className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => applyTemplate(template)}
                            >
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.description}</div>
                              <div className="text-xs mt-1 font-mono text-primary">{template.example}</div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="source_path">Source Path *</Label>
                    <Input
                      id="source_path"
                      value={formData.source_path}
                      onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
                      placeholder="/old-page"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must start with /. Use regex if pattern matching is enabled.
                      {formData.is_pattern && (
                        <span className="block mt-1 text-primary">
                          Tip: Use <code>(/.*)?$</code> at end to capture subpaths, e.g. <code>/old-section(/.*)?$</code>
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="destination_path">Destination Path *</Label>
                    <Input
                      id="destination_path"
                      value={formData.destination_path}
                      onChange={(e) => setFormData({ ...formData, destination_path: e.target.value })}
                      placeholder="/new-page or https://example.com"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Relative path or full URL.
                      {formData.is_pattern && (
                        <span className="block mt-1 text-primary">
                          Use <code>$1</code> to include captured subpath, e.g. <code>/new-section$1</code>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status_code">Status Code</Label>
                      <Select
                        value={String(formData.status_code)}
                        onValueChange={(v) => setFormData({ ...formData, status_code: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="301">301 (Permanent)</SelectItem>
                          <SelectItem value="302">302 (Temporary)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status code is stored for reference but redirects are handled client-side.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <Switch
                        id="is_pattern"
                        checked={formData.is_pattern}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_pattern: checked })}
                      />
                      <Label htmlFor="is_pattern" className="cursor-pointer">
                        Regex Pattern
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Why this redirect was created..."
                      className="h-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingRedirect ? "Update" : "Create"} Redirect
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search redirects..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterActive} onValueChange={(v: "all" | "active" | "inactive") => setFilterActive(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredRedirects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {redirects.length === 0 ? "No redirects yet. Add your first one!" : "No redirects match your search."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Hits</TableHead>
                    <TableHead>Last Hit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRedirects.map((redirect) => (
                    <TableRow key={redirect.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-1 rounded max-w-[200px] truncate block">
                            {redirect.source_path}
                          </code>
                          {redirect.is_pattern && (
                            <Badge variant="secondary" className="text-xs">regex</Badge>
                          )}
                        </div>
                        {redirect.notes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                            {redirect.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded max-w-[200px] truncate block">
                          {redirect.destination_path}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={redirect.status_code === 301 ? "default" : "secondary"}>
                          {redirect.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={redirect.is_active}
                          onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: redirect.id, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {(redirect.hit_count ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {redirect.last_hit_at ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(redirect.last_hit_at), "MMM d, HH:mm")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(redirect)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this redirect?")) {
                                deleteMutation.mutate(redirect.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
