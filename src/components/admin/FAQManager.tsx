import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshAdminData } from "@/lib/adminSupabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FAQ {
  id: string;
  product_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  generated_by: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  game_id: string;
}

interface Game {
  id: string;
  name: string;
}

interface GenerationLog {
  id: string;
  product_id: string;
  operation_type: string;
  status: string;
  questions_generated: number;
  processing_time_ms: number;
  error_message: string | null;
  created_at: string;
  product?: { name: string };
  product_name?: string;
}

type Scope = "game" | "category" | "product";

export const FAQManager = () => {
  const [activeTab, setActiveTab] = useState("bulk");
  const [scope, setScope] = useState<Scope>("category");
  
  // Data states
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  // Selection states
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [faqStatus, setFaqStatus] = useState<'all' | 'missing' | 'has'>('all');
  
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [affectedProducts, setAffectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [regenerate, setRegenerate] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(6);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchCategories(selectedGame);
      setSelectedCategory("");
      setSelectedProduct("");
    }
  }, [selectedGame]);

  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory);
      setSelectedProduct("");
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedProduct) {
      fetchFAQs(selectedProduct);
    }
  }, [selectedProduct]);

  useEffect(() => {
    updateAffectedProducts();
  }, [scope, selectedGame, selectedCategory, selectedProduct, products]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error('Failed to fetch games');
      return;
    }

    setGames(data || []);
  };

  const fetchCategories = async (gameId: string) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, game_id')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error('Failed to fetch categories');
      return;
    }

    setCategories(data || []);
  };

  const fetchProducts = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category_id')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch products');
      return;
    }

    setAllProducts(data || []);
    filterProductsByFaqStatus(data || [], faqStatus);
  };

  const filterProductsByFaqStatus = async (productList: Product[], status: 'all' | 'missing' | 'has') => {
    if (status === 'all') {
      setProducts(productList);
      return;
    }

    // Get product IDs that have FAQs
    const productIds = productList.map(p => p.id);
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }

    const { data: faqData, error } = await supabase
      .from('product_faqs')
      .select('product_id')
      .in('product_id', productIds);

    if (error) {
      toast.error('Failed to check FAQ status');
      setProducts(productList);
      return;
    }

    const productsWithFaqs = new Set((faqData || []).map(f => f.product_id));

    if (status === 'missing') {
      setProducts(productList.filter(p => !productsWithFaqs.has(p.id)));
    } else {
      setProducts(productList.filter(p => productsWithFaqs.has(p.id)));
    }
  };

  useEffect(() => {
    if (allProducts.length > 0) {
      filterProductsByFaqStatus(allProducts, faqStatus);
    }
  }, [faqStatus]);

  const updateAffectedProducts = async () => {
    if (!selectedGame) {
      setAffectedProducts([]);
      return;
    }

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        category_id,
        categories!inner(game_id)
      `)
      .eq('is_active', true);

    if (scope === "game") {
      query = query.eq('categories.game_id', selectedGame);
    } else if (scope === "category" && selectedCategory) {
      query = query.eq('category_id', selectedCategory);
    } else if (scope === "product" && selectedProduct) {
      query = query.eq('id', selectedProduct);
    } else {
      setAffectedProducts([]);
      return;
    }

    const { data, error } = await query.order('name');

    if (error) {
      console.error('Failed to fetch affected products:', error);
      setAffectedProducts([]);
      return;
    }

    setAffectedProducts(data || []);
  };

  const fetchFAQs = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_faqs')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');

    if (error) {
      toast.error('Failed to fetch FAQs');
      return;
    }

    setFaqs(data || []);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('faq_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error('Failed to fetch logs');
      return;
    }

    const logsData = (data || []) as GenerationLog[];
    const productIds = Array.from(new Set(logsData.map((log) => log.product_id).filter(Boolean)));

    if (productIds.length === 0) {
      setLogs(logsData);
      return;
    }

    const { data: productData, error: productsError } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    if (productsError) {
      // Keep logs usable even if product lookup fails.
      setLogs(logsData);
      return;
    }

    const productNameById = new Map((productData || []).map((p) => [p.id, p.name]));
    const logsWithNames = logsData.map((log) => ({
      ...log,
      product_name: log.product_id ? productNameById.get(log.product_id) || undefined : undefined,
    }));

    setLogs(logsWithNames);
  };

  const generateFAQs = async () => {
    if (!selectedGame) {
      toast.error('Please select a game');
      return;
    }

    if ((scope === "category" || scope === "product") && !selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (scope === "product" && !selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-product-faqs', {
        body: {
          scope,
          gameId: selectedGame,
          categoryId: scope !== "game" ? selectedCategory : undefined,
          productId: scope === "product" ? selectedProduct : undefined,
          dryRun,
          regenerate,
          questionsCount,
        },
      });

      if (error) {
        const serverErrorMessage =
          (error as any)?.context?.body?.error ||
          (error as any)?.context?.body ||
          (error as any)?.message ||
          'Unknown error';

        console.error('Edge function error:', error);
        throw new Error(serverErrorMessage);
      }

      if (dryRun) {
        toast.success(`Preview generated for ${data.processed} products`, {
          description: `${data.generated} FAQs would be created`
        });
      } else {
        toast.success(`FAQs generated successfully!`, {
          description: `Generated ${data.generated} FAQ sets, skipped ${data.skipped}`
        });
        fetchLogs();
        if (selectedProduct) {
          fetchFAQs(selectedProduct);
        }
      }
    } catch (error: any) {
      console.error('Error generating FAQs:', error);
      toast.error('Failed to generate FAQs', {
        description: error?.message ?? 'Unknown error while generating FAQs',
      });
    } finally {
      setLoading(false);
    }
  };

  const addFAQ = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    const maxSortOrder = Math.max(...faqs.map(f => f.sort_order), -1);

    const { error } = await supabase
      .from('product_faqs')
      .insert({
        product_id: selectedProduct,
        question: 'New Question',
        answer: 'New Answer',
        sort_order: maxSortOrder + 1,
        generated_by: 'manual'
      });

    if (error) {
      toast.error('Failed to add FAQ');
      return;
    }

    toast.success('FAQ added');
    await refreshAdminData(['/rest/v1/product_faqs'], ['product-faqs']);
    fetchFAQs(selectedProduct);
  };

  const updateFAQ = async (id: string, updates: Partial<FAQ>) => {
    const { error } = await supabase
      .from('product_faqs')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update FAQ');
      return;
    }

    toast.success('FAQ updated');
    await refreshAdminData(['/rest/v1/product_faqs'], ['product-faqs']);
    fetchFAQs(selectedProduct);
  };

  const confirmDeleteFAQ = (id: string) => {
    setFaqToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deleteFAQ = async () => {
    if (!faqToDelete) return;

    const { error } = await supabase
      .from('product_faqs')
      .delete()
      .eq('id', faqToDelete);

    if (error) {
      toast.error('Failed to delete FAQ');
      return;
    }

    toast.success('FAQ deleted');
    await refreshAdminData(['/rest/v1/product_faqs'], ['product-faqs']);
    fetchFAQs(selectedProduct);
    setDeleteDialogOpen(false);
    setFaqToDelete(null);
  };

  const canGenerate = () => {
    if (!selectedGame) return false;
    if (scope === "game") return true;
    if (scope === "category") return !!selectedCategory;
    if (scope === "product") return !!selectedProduct;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">FAQ Manager</h2>
        <p className="text-muted-foreground">
          Generate and manage AI-powered FAQs for products
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bulk">Bulk Generation</TabsTrigger>
          <TabsTrigger value="manage">Manage FAQs</TabsTrigger>
          <TabsTrigger value="logs">Generation Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scoped FAQ Generation</CardTitle>
              <CardDescription>
                Generate AI-powered FAQs by game, category, or individual product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Generation Scope</Label>
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as Scope)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="game" id="scope-game" />
                    <Label htmlFor="scope-game" className="font-normal cursor-pointer">
                      Entire Game (all categories)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="category" id="scope-category" />
                    <Label htmlFor="scope-category" className="font-normal cursor-pointer">
                      Single Category (recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="product" id="scope-product" />
                    <Label htmlFor="scope-product" className="font-normal cursor-pointer">
                      Single Product
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Game *</Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger>
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

                {(scope === "category" || scope === "product") && (
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      value={selectedCategory} 
                      onValueChange={setSelectedCategory}
                      disabled={!selectedGame}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scope === "product" && (
                  <>
                    <div className="space-y-2">
                      <Label>FAQ Status</Label>
                      <Select 
                        value={faqStatus} 
                        onValueChange={(v: 'all' | 'missing' | 'has') => setFaqStatus(v)}
                        disabled={!selectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="missing">Missing FAQs</SelectItem>
                          <SelectItem value="has">Has FAQs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Product *</Label>
                      <Select 
                        value={selectedProduct} 
                        onValueChange={setSelectedProduct}
                        disabled={!selectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Questions per Product</Label>
                  <Input
                    type="number"
                    min={3}
                    max={10}
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dry-run"
                    checked={dryRun}
                    onCheckedChange={setDryRun}
                  />
                  <Label htmlFor="dry-run">Dry Run (Preview Only)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="regenerate"
                    checked={regenerate}
                    onCheckedChange={setRegenerate}
                  />
                  <Label htmlFor="regenerate">Regenerate Existing</Label>
                </div>
              </div>

              {affectedProducts.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>{affectedProducts.length} product{affectedProducts.length !== 1 ? 's' : ''}</strong> will be affected:
                    <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                      {affectedProducts.map((p) => (
                        <div key={p.id}>• {p.name}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {dryRun && (
                <Alert>
                  <AlertDescription>
                    Dry run mode: FAQs will be generated but not saved. Perfect for testing.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={generateFAQs}
                disabled={loading || !canGenerate()}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {dryRun ? 'Preview Generation' : `Generate FAQs for ${affectedProducts.length} product${affectedProducts.length !== 1 ? 's' : ''}`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage FAQs</CardTitle>
              <CardDescription>
                Edit, reorder, and manage product FAQs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={setSelectedCategory}
                    disabled={!selectedGame}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select 
                    value={selectedProduct} 
                    onValueChange={setSelectedProduct}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProduct && (
                <>
                  <Button onClick={addFAQ} variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New FAQ
                  </Button>

                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <Card key={faq.id}>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Badge variant={faq.generated_by === 'ai' ? 'default' : 'secondary'}>
                                {faq.generated_by === 'ai' ? 'AI Generated' : 'Manual'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateFAQ(faq.id, { is_active: !faq.is_active })}
                              >
                                {faq.is_active ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteFAQ(faq.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Question</Label>
                            <Input
                              value={faq.question}
                              onChange={(e) => updateFAQ(faq.id, { question: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Answer</Label>
                            <Textarea
                              value={faq.answer}
                              onChange={(e) => updateFAQ(faq.id, { answer: e.target.value })}
                              rows={4}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generation Logs</CardTitle>
              <CardDescription>
                View recent FAQ generation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{log.product_name || log.product?.name || 'Batch Operation'}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.operation_type} - {log.questions_generated} questions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-destructive">{log.error_message}</p>
                      )}
                    </div>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFAQ}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
