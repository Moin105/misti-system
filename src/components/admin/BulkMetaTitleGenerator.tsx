import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2, Filter, Type, Gamepad2, FolderOpen } from "lucide-react";

interface BulkMetaTitleGeneratorProps {
  onComplete: () => void;
}

interface PreviewResult {
  product_id: string;
  product_name: string;
  status: string;
  meta_title?: string;
  error?: string;
  selected?: boolean;
}

interface Game {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  game_id: string;
}

export const BulkMetaTitleGenerator = ({ onComplete }: BulkMetaTitleGeneratorProps) => {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [updateMode, setUpdateMode] = useState<'missing' | 'all'>('missing');
  const [successCount, setSuccessCount] = useState(0);

  // Game and category filtering
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [productCount, setProductCount] = useState<number | null>(null);

  // Fetch games on mount
  useEffect(() => {
    const fetchGames = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setGames(data);
      }
    };
    fetchGames();
  }, []);

  // Fetch categories when game changes
  useEffect(() => {
    const fetchCategories = async () => {
      let query = supabase
        .from('categories')
        .select('id, name, slug, game_id')
        .eq('is_active', true)
        .order('name');
      
      if (selectedGameId !== 'all') {
        query = query.eq('game_id', selectedGameId);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        setCategories(data);
      }
      setSelectedCategoryId('all'); // Reset category when game changes
    };
    fetchCategories();
  }, [selectedGameId]);

  // Update product count when filters change
  useEffect(() => {
    const fetchProductCount = async () => {
      let query = supabase
        .from('products')
        .select('id, category_id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (updateMode === 'missing') {
        query = query.is('meta_title', null);
      }

      // Filter by game (via category)
      if (selectedGameId !== 'all') {
        const categoryIds = categories
          .filter(c => c.game_id === selectedGameId)
          .map(c => c.id);
        
        if (categoryIds.length > 0) {
          query = query.in('category_id', categoryIds);
        } else {
          setProductCount(0);
          return;
        }
      }

      // Filter by category
      if (selectedCategoryId !== 'all') {
        query = query.eq('category_id', selectedCategoryId);
      }

      const { count, error } = await query;
      
      if (!error) {
        setProductCount(count);
      }
    };

    fetchProductCount();
  }, [selectedGameId, selectedCategoryId, updateMode, categories]);

  const runPreview = async () => {
    setIsLoading(true);
    setShowPreviewDialog(true);
    
    try {
      // Build category IDs filter based on game selection
      let categoryIdsFilter: string[] | null = null;
      
      if (selectedCategoryId !== 'all') {
        categoryIdsFilter = [selectedCategoryId];
      } else if (selectedGameId !== 'all') {
        categoryIdsFilter = categories
          .filter(c => c.game_id === selectedGameId)
          .map(c => c.id);
        
        if (categoryIdsFilter.length === 0) {
          setPreviewResults([]);
          setIsLoading(false);
          return;
        }
      }

      // Build base query for counting
      let countQuery = supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (updateMode === 'missing') {
        countQuery = countQuery.is('meta_title', null);
      }
      
      if (categoryIdsFilter) {
        countQuery = countQuery.in('category_id', categoryIdsFilter);
      }
      
      const { count } = await countQuery;
      
      if (!count || count === 0) {
        setPreviewResults([]);
        setIsLoading(false);
        return;
      }

      const allResults: PreviewResult[] = [];
      const chunkSize = 10;
      
      // Fetch products in chunks
      for (let offset = 0; offset < count; offset += chunkSize) {
        let query = supabase
          .from('products')
          .select('id')
          .eq('is_active', true)
          .range(offset, offset + chunkSize - 1);
        
        if (updateMode === 'missing') {
          query = query.is('meta_title', null);
        }
        
        if (categoryIdsFilter) {
          query = query.in('category_id', categoryIdsFilter);
        }
        
        const { data: productChunk, error } = await query;
        
        if (error) throw error;
        if (!productChunk?.length) break;
        
        const productIds = productChunk.map(p => p.id);
        
        const { data, error: funcError } = await supabase.functions.invoke('generate-product-meta-titles', {
          body: { 
            dryRun: true,
            productIds,
            updateMode
          }
        });
        
        if (funcError) throw funcError;
        if (data?.results) {
          allResults.push(...data.results.map((r: PreviewResult) => ({ ...r, selected: true })));
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setPreviewResults(allResults);
      toast.success(`Preview generated for ${allResults.length} products`);
      
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(`Failed to generate preview: ${error.message}`);
      setShowPreviewDialog(false);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToConfirm = () => {
    setShowPreviewDialog(false);
    setShowConfirmDialog(true);
  };

  const runFullUpdate = async () => {
    setShowConfirmDialog(false);
    setShowProgressDialog(true);
    setProgress(0);
    
    const selectedProducts = previewResults.filter(r => r.selected);
    
    if (selectedProducts.length === 0) {
      toast.error('No products selected for update');
      setShowProgressDialog(false);
      return;
    }
    
    try {
      const chunkSize = 10;
      let processedCount = 0;
      let totalSuccess = 0;
      
      for (let i = 0; i < selectedProducts.length; i += chunkSize) {
        const chunk = selectedProducts.slice(i, i + chunkSize);
        const productIds = chunk.map(p => p.product_id);
        
        const { data, error } = await supabase.functions.invoke('generate-product-meta-titles', {
          body: { 
            dryRun: false,
            productIds,
            updateMode
          }
        });
        
        if (error) throw error;
        
        processedCount += chunk.length;
        totalSuccess += data?.successCount || 0;
        setProgress(Math.round((processedCount / selectedProducts.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSuccessCount(totalSuccess);
      setShowProgressDialog(false);
      setShowResultsDialog(true);
      onComplete();
      toast.success(`Successfully updated ${totalSuccess} meta titles!`);
      
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Failed to generate meta titles: ${error.message}`);
      setShowProgressDialog(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setPreviewResults(prev => 
      prev.map(r => 
        r.product_id === productId ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const updateMetaTitle = (productId: string, newTitle: string) => {
    setPreviewResults(prev => 
      prev.map(r => 
        r.product_id === productId ? { ...r, meta_title: newTitle } : r
      )
    );
  };

  const toggleAllSelection = () => {
    const allSelected = previewResults.every(r => r.selected);
    setPreviewResults(prev => 
      prev.map(r => ({ ...r, selected: !allSelected }))
    );
  };

  const selectedCount = previewResults.filter(r => r.selected).length;

  const resetState = () => {
    setShowPreviewDialog(false);
    setShowConfirmDialog(false);
    setShowProgressDialog(false);
    setShowResultsDialog(false);
    setPreviewResults([]);
    setProgress(0);
    setConfirmChecked(false);
  };

  const getSelectedGameName = () => {
    if (selectedGameId === 'all') return 'All Games';
    return games.find(g => g.id === selectedGameId)?.name || 'Unknown';
  };

  const getSelectedCategoryName = () => {
    if (selectedCategoryId === 'all') return 'All Categories';
    return categories.find(c => c.id === selectedCategoryId)?.name || 'Unknown';
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Game Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Gamepad2 className="w-4 h-4 text-muted-foreground" />
            Filter by Game
          </Label>
          <Select value={selectedGameId} onValueChange={setSelectedGameId}>
            <SelectTrigger className="w-full max-w-[320px]">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">All Games</span>
              </SelectItem>
              {games.map(game => (
                <SelectItem key={game.id} value={game.id}>
                  {game.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            Filter by Category
          </Label>
          <Select 
            value={selectedCategoryId} 
            onValueChange={setSelectedCategoryId}
            disabled={categories.length === 0}
          >
            <SelectTrigger className="w-full max-w-[320px]">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">All Categories</span>
              </SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Update Mode */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Update Mode
          </Label>
          <Select value={updateMode} onValueChange={(value: 'missing' | 'all') => setUpdateMode(value)}>
            <SelectTrigger className="w-full max-w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="missing">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Missing Meta Titles</span>
                  <span className="text-xs text-muted-foreground">Products without meta titles</span>
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex flex-col items-start">
                  <span className="font-medium">All Products</span>
                  <span className="text-xs text-muted-foreground">Regenerate all meta titles</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Count & Generate Button */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            onClick={runPreview}
            variant="outline"
            className="gap-2"
            disabled={productCount === 0}
          >
            <Type className="w-4 h-4" />
            Generate Meta Titles Preview
          </Button>
          
          {productCount !== null && (
            <Badge variant="secondary" className="text-sm">
              {productCount} product{productCount !== 1 ? 's' : ''} found
            </Badge>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Meta Title Preview ({isLoading ? '...' : `${previewResults.length} products`})
            </DialogTitle>
            <DialogDescription>
              {selectedGameId !== 'all' && (
                <span className="mr-2">
                  <Badge variant="outline" className="mr-1">{getSelectedGameName()}</Badge>
                  {selectedCategoryId !== 'all' && (
                    <Badge variant="outline">{getSelectedCategoryName()}</Badge>
                  )}
                </span>
              )}
              Review and edit the generated meta titles before applying
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating AI-powered meta titles...</p>
            </div>
          ) : previewResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">All Set!</h3>
                <p className="text-muted-foreground mt-1">
                  No products need meta title updates.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={previewResults.length > 0 && previewResults.every(r => r.selected)}
                    onCheckedChange={toggleAllSelection}
                  />
                  <span className="text-sm font-medium">Select All ({selectedCount} selected)</span>
                </div>
              </div>
              
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-3">
                  {previewResults.map((result, index) => (
                    <Card key={result.product_id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={result.selected}
                          onCheckedChange={() => toggleProductSelection(result.product_id)}
                          className="mt-1"
                        />
                        <Badge variant="outline" className="mt-1">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-semibold text-sm">{result.product_name}</h4>
                          <div className="space-y-1">
                            <Input
                              value={result.meta_title || ''}
                              onChange={(e) => updateMetaTitle(result.product_id, e.target.value)}
                              placeholder="Meta title..."
                              className="text-sm"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{result.meta_title?.length || 0}/60 characters</span>
                              {result.meta_title && result.meta_title.length > 60 && (
                                <span className="text-destructive">Too long!</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={proceedToConfirm} 
              disabled={selectedCount === 0 || isLoading}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Apply {selectedCount} Meta Titles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Meta Title Update</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update meta titles for {selectedCount} products. This will overwrite any existing meta titles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-4">
            <Checkbox 
              id="confirm"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(!!checked)}
            />
            <label htmlFor="confirm" className="text-sm">
              I understand this will update the database
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmChecked(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={runFullUpdate}
              disabled={!confirmChecked}
            >
              Update Meta Titles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Updating Meta Titles...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={progress} />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <AlertDialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Meta Titles Updated!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Successfully updated {successCount} product meta titles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetState}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
