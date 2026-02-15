import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, X, Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { env } from "@/lib/env";

interface ProductReward {
  id: string;
  product_id: string;
  rewards_content: string;
  is_approved: boolean;
  generated_at: string;
  approved_at: string | null;
  products?: {
    name: string;
    slug: string;
  };
}

interface Game {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  game_id: string;
}

const RewardsManager = () => {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'game' | 'category' | 'product'>('game');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [dryRun, setDryRun] = useState(true);
  const [regenerate, setRegenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [editingReward, setEditingReward] = useState<ProductReward | null>(null);
  const [editContent, setEditContent] = useState('');
  const [rewardStatus, setRewardStatus] = useState<'all' | 'missing' | 'has'>('all');
  // Fetch games
  const { data: games = [] } = useQuery({
    queryKey: ['admin-games'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Game[];
    },
  });

  // Fetch categories based on selected game
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories', selectedGameId],
    queryFn: async () => {
      if (!selectedGameId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, game_id')
        .eq('game_id', selectedGameId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!selectedGameId,
  });

  // Fetch products based on selected category with reward status
  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-with-rewards', selectedCategoryId, rewardStatus],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      
      // First get all products
      const { data: allProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('category_id', selectedCategoryId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (productsError) throw productsError;
      
      if (rewardStatus === 'all') return allProducts || [];
      
      // Get products that have rewards
      const { data: rewardedProducts, error: rewardsError } = await supabase
        .from('product_rewards')
        .select('product_id');
      if (rewardsError) throw rewardsError;
      
      const rewardedIds = new Set((rewardedProducts || []).map(r => r.product_id));
      
      if (rewardStatus === 'missing') {
        return (allProducts || []).filter(p => !rewardedIds.has(p.id));
      } else {
        return (allProducts || []).filter(p => rewardedIds.has(p.id));
      }
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch pending rewards (usually small list)
  const { data: pendingRewards = [], isLoading: loadingPending } = useQuery({
    queryKey: ['product-rewards-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_rewards')
        .select(`
          *,
          products (name, slug)
        `)
        .eq('is_approved', false)
        .order('generated_at', { ascending: false });
      if (error) throw error;
      return data as ProductReward[];
    },
  });

  // Fetch approved rewards with pagination (limit to 50 for performance)
  const { data: approvedRewards = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['product-rewards-approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_rewards')
        .select(`
          *,
          products (name, slug)
        `)
        .eq('is_approved', true)
        .order('approved_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ProductReward[];
    },
  });

  const loadingRewards = loadingPending || loadingApproved;

  // Generate rewards mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-product-rewards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scope,
            gameId: selectedGameId || undefined,
            categoryId: selectedCategoryId || undefined,
            productId: selectedProductId || undefined,
            dryRun,
            regenerate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (dryRun) {
        setPreviewResults(data.results || []);
        toast.success(`Preview: ${data.previews} rewards generated`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['product-rewards-pending'] });
        toast.success(`Generated ${data.generated} rewards, ${data.skipped} skipped`);
        setPreviewResults([]);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve reward mutation
  const approveMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('product_rewards')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-rewards-pending'] });
      queryClient.invalidateQueries({ queryKey: ['product-rewards-approved'] });
      toast.success('Reward approved and published');
    },
    onError: () => {
      toast.error('Failed to approve reward');
    },
  });

  // Update reward mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('product_rewards')
        .update({
          rewards_content: content,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-rewards-pending'] });
      queryClient.invalidateQueries({ queryKey: ['product-rewards-approved'] });
      setEditingReward(null);
      toast.success('Reward updated');
    },
    onError: () => {
      toast.error('Failed to update reward');
    },
  });

  // Delete reward mutation
  const deleteMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('product_rewards')
        .delete()
        .eq('id', rewardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-rewards-pending'] });
      queryClient.invalidateQueries({ queryKey: ['product-rewards-approved'] });
      toast.success('Reward deleted');
    },
    onError: () => {
      toast.error('Failed to delete reward');
    },
  });

  const handleGenerate = () => {
    if (scope === 'game' && !selectedGameId) {
      toast.error('Please select a game');
      return;
    }
    if (scope === 'category' && !selectedCategoryId) {
      toast.error('Please select a category');
      return;
    }
    if (scope === 'product' && !selectedProductId) {
      toast.error('Please select a product');
      return;
    }
    setIsGenerating(true);
    generateMutation.mutate();
    setIsGenerating(false);
  };

  const handleEdit = (reward: ProductReward) => {
    setEditingReward(reward);
    setEditContent(reward.rewards_content);
  };

  const handleSaveEdit = () => {
    if (!editingReward) return;
    updateMutation.mutate({
      id: editingReward.id,
      content: editContent,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review
            {pendingRewards.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRewards.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedRewards.length})</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Rewards Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={scope} onValueChange={(v: 'game' | 'category' | 'product') => setScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="game">All products in Game</SelectItem>
                      <SelectItem value="category">All products in Category</SelectItem>
                      <SelectItem value="product">Single Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Game</Label>
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map(game => (
                        <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(scope === 'category' || scope === 'product') && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scope === 'product' && (
                  <>
                    <div className="space-y-2">
                      <Label>Reward Status</Label>
                      <Select value={rewardStatus} onValueChange={(v: 'all' | 'missing' | 'has') => setRewardStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="missing">Missing Rewards</SelectItem>
                          <SelectItem value="has">Has Rewards</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Product</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(prod => (
                            <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Switch checked={dryRun} onCheckedChange={setDryRun} />
                  <Label>Preview Only (Dry Run)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={regenerate} onCheckedChange={setRegenerate} />
                  <Label>Regenerate Existing</Label>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {dryRun ? 'Preview Generation' : 'Generate Rewards'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Results */}
          {previewResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewResults.map((result, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{result.productName}</h4>
                      <Badge variant={result.status === 'preview' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                        {result.status}
                      </Badge>
                    </div>
                    {result.content && (
                      <div 
                        className="prose prose-sm max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(result.content) }}
                      />
                    )}
                    {result.error && (
                      <p className="text-sm text-destructive">{result.error}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pending Review Tab */}
        <TabsContent value="pending" className="space-y-4">
          {loadingRewards ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingRewards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                No rewards pending review
              </CardContent>
            </Card>
          ) : (
            pendingRewards.map(reward => (
              <Card key={reward.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{reward.products?.name || 'Unknown Product'}</CardTitle>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated: {new Date(reward.generated_at).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(reward.rewards_content) }}
                  />
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => approveMutation.mutate(reward.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(reward)}>
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteMutation.mutate(reward.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          {approvedRewards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No approved rewards yet
              </CardContent>
            </Card>
          ) : (
            approvedRewards.map(reward => (
              <Card key={reward.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{reward.products?.name || 'Unknown Product'}</CardTitle>
                    <Badge variant="default" className="bg-green-600">Published</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approved: {reward.approved_at ? new Date(reward.approved_at).toLocaleString() : 'N/A'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(reward.rewards_content) }}
                  />
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(reward)}>
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteMutation.mutate(reward.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingReward} onOpenChange={() => setEditingReward(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rewards Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rewards Content (HTML)</Label>
              <Textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReward(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewardsManager;
