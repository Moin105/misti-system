import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, Filter } from "lucide-react";

interface BulkSEOGeneratorProps {
  totalProducts: number;
  productsNeedingSEO: number;
  onComplete: () => void;
}

interface PreviewResult {
  product_id: string;
  product_name: string;
  status: string;
  meta_description?: string;
  meta_keywords?: string;
  image_alt_text?: string;
  og_image?: string | null;
  error?: string;
  selected?: boolean; // Add selection state
}

interface GenerationResult {
  success: boolean;
  dryRun: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  totalTime: number;
  results: PreviewResult[];
}

export const BulkSEOGenerator = ({ totalProducts, productsNeedingSEO, onComplete }: BulkSEOGeneratorProps) => {
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [finalResults, setFinalResults] = useState<GenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentProduct, setCurrentProduct] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [updateMode, setUpdateMode] = useState<'missing' | 'empty_all' | 'all'>('all');

  const runPreview = async () => {
    setIsLoading(true);
    setShowPreviewDialog(true);
    
    try {
      // For "all" mode, fetch products first and process in chunks
      if (updateMode === 'all') {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        if (!count) throw new Error('No products found');
        
        const allResults: PreviewResult[] = [];
        const chunkSize = 10;
        let processedCount = 0;
        
        // Process in chunks
        for (let offset = 0; offset < count; offset += chunkSize) {
          const { data: productChunk, error: chunkError } = await supabase
            .from('products')
            .select('id')
            .range(offset, offset + chunkSize - 1);
          
          if (chunkError) throw chunkError;
          if (!productChunk?.length) break;
          
          const productIds = productChunk.map(p => p.id);
          
          // Call edge function with this chunk
          const { data, error } = await supabase.functions.invoke('generate-product-seo', {
            body: { 
              dryRun: true,
              productIds: productIds,
              updateMode: 'all'
            }
          });
          
          if (error) throw error;
          if (!data?.results) throw new Error('Invalid response structure');
          
          allResults.push(...data.results);
          processedCount += productChunk.length;
          
          console.log(`Processed ${processedCount}/${count} products`);
          
          // Small delay between chunks to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Mark all as selected by default
        const resultsWithSelection = allResults.map(r => ({
          ...r,
          selected: true
        }));
        
        setPreviewResults(resultsWithSelection);
        toast.success(`Preview generated for ${allResults.length} products`);
        setIsLoading(false);
        return;
      }
      
      // For "missing" and "empty_all" modes, use single request
      const { data, error } = await supabase.functions.invoke('generate-product-seo', {
        body: { 
          dryRun: true, 
          batchSize: 10,
          updateMode: updateMode
        }
      });
      
      console.log('Full response:', { data, error });
      
      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data received from function');
      }
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error(`Invalid response structure. Expected data.results array, got: ${JSON.stringify(data)}`);
      }
      
      // Mark all as selected by default
      const resultsWithSelection = data.results.map((r: PreviewResult) => ({
        ...r,
        selected: true
      }));
      
      setPreviewResults(resultsWithSelection);
      toast.success(`Preview generated for ${data.totalProcessed} products`);
      
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(`Failed to generate preview: ${error.message || 'Unknown error'}`);
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
    setCurrentProduct("");
    
    const selectedProducts = previewResults.filter(r => r.selected);
    
    if (selectedProducts.length === 0) {
      toast.error('No products selected for update');
      setShowProgressDialog(false);
      return;
    }
    
    try {
      if (updateMode === 'all') {
        // Process in chunks for "all" mode
        const allResults: PreviewResult[] = [];
        const chunkSize = 10;
        
        for (let i = 0; i < selectedProducts.length; i += chunkSize) {
          const chunk = selectedProducts.slice(i, i + chunkSize);
          const productIds = chunk.map(p => p.product_id);
          
          setCurrentProduct(`Processing batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(selectedProducts.length / chunkSize)}...`);
          
          const { data, error } = await supabase.functions.invoke('generate-product-seo', {
            body: { 
              dryRun: false,
              productIds: productIds,
              updateMode: 'all'
            }
          });
          
          if (error) throw error;
          if (data?.results) {
            allResults.push(...data.results);
          }
          
          setProgress(Math.round(((i + chunk.length) / selectedProducts.length) * 100));
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setFinalResults({
          success: true,
          dryRun: false,
          totalProcessed: allResults.length,
          successCount: allResults.filter(r => r.status === 'generated').length,
          errorCount: allResults.filter(r => r.status === 'error').length,
          totalTime: 0,
          results: allResults
        });
        
      } else {
        // Existing logic for "missing" and "empty_all"
        const productIds = selectedProducts.map(r => r.product_id);
        
        setCurrentProduct("Processing products...");
        
        const { data, error } = await supabase.functions.invoke('generate-product-seo', {
          body: { 
            dryRun: false,
            productIds: productIds,
            updateMode: updateMode
          }
        });
        
        if (error) throw error;
        if (!data) throw new Error('No data received from function');
        
        setProgress(100);
        setFinalResults(data);
      }
      
      setShowProgressDialog(false);
      setShowResultsDialog(true);
      onComplete();
      
      toast.success(`Successfully updated ${finalResults?.successCount || selectedProducts.length} products!`);
      
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Failed to generate SEO metadata: ${error.message || 'Unknown error'}`);
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
    setFinalResults(null);
    setProgress(0);
    setCurrentProduct("");
    setConfirmChecked(false);
  };

  const getFilterLabel = () => {
    switch(updateMode) {
      case 'missing': return 'Products Missing SEO';
      case 'empty_all': return 'Products Without Any SEO';
      case 'all': return 'All Products';
    }
  };

  const getFilterDescription = () => {
    switch(updateMode) {
      case 'missing': return 'Products missing at least one SEO field';
      case 'empty_all': return 'Products missing all SEO fields';
      case 'all': return 'Every product in the catalog';
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={updateMode} onValueChange={(value: 'missing' | 'empty_all' | 'all') => setUpdateMode(value)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="missing">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Missing SEO</span>
                  <span className="text-xs text-muted-foreground">Products missing any SEO field</span>
                </div>
              </SelectItem>
              <SelectItem value="empty_all">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Empty All SEO</span>
                  <span className="text-xs text-muted-foreground">Products with no SEO at all</span>
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex flex-col items-start">
                  <span className="font-medium">All Products</span>
                  <span className="text-xs text-muted-foreground">Update entire catalog</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button
              onClick={runPreview}
              variant="outline"
              className="gap-2"
              disabled={totalProducts === 0 || (updateMode === 'missing' && productsNeedingSEO === 0)}
            >
              <Sparkles className="w-4 h-4" />
              Generate SEO Preview
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mr-2">{getFilterLabel()}</Badge>
              {updateMode === 'missing' && `${productsNeedingSEO} need SEO`}
              {updateMode === 'all' && `${totalProducts} total products`}
            </div>
          </div>
          
          {productsNeedingSEO === 0 && updateMode === 'missing' && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>All products already have SEO metadata! ✅</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              SEO Preview ({isLoading ? '...' : `${previewResults.length} products`})
            </DialogTitle>
            <DialogDescription>
              Select which products to update, then proceed to generate
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-muted-foreground">Generating AI-powered SEO metadata...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take 3-4 minutes for large catalogs (95+ products)
                </p>
              </div>
            </div>
          ) : !isLoading && previewResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">All Set! ✅</h3>
                <p className="text-muted-foreground mt-1">
                  No products need SEO updates with the current filter.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try changing the filter to "All Products" to regenerate SEO for everything.
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
              
              <ScrollArea className="h-[55vh] pr-4">
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
                          <h4 className="font-semibold text-base">{result.product_name}</h4>
                          
                          <div className="grid gap-2 text-sm">
                            <div className="grid grid-cols-[140px_1fr] gap-2">
                              <span className="font-medium text-muted-foreground">Meta Description:</span>
                              <span className="text-foreground break-words">{result.meta_description}</span>
                            </div>
                            
                            <div className="grid grid-cols-[140px_1fr] gap-2">
                              <span className="font-medium text-muted-foreground">Meta Keywords:</span>
                              <span className="text-foreground break-words">{result.meta_keywords}</span>
                            </div>
                            
                            <div className="grid grid-cols-[140px_1fr] gap-2">
                              <span className="font-medium text-muted-foreground">Alt Text:</span>
                              <span className="text-foreground break-words">{result.image_alt_text}</span>
                            </div>
                            
                            {result.og_image && (
                              <div className="grid grid-cols-[140px_1fr] gap-2">
                                <span className="font-medium text-muted-foreground">OG Image:</span>
                                <span className="text-success">✓ Set</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedCount} of {previewResults.length} products selected for update
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Cancel
              </Button>
              <Button onClick={proceedToConfirm} disabled={isLoading || selectedCount === 0}>
                Proceed to Generate ({selectedCount})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Confirm SEO Generation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ You are about to update SEO fields for {selectedCount} selected products.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This will overwrite existing meta_description, meta_keywords, 
                  image_alt_text, and og_image values for the selected products.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Old values will be backed up in the audit log.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmChecked}
                  onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                />
                <label
                  htmlFor="confirm"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this will overwrite existing SEO data
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmChecked(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={runFullUpdate}
              disabled={!confirmChecked}
            >
              Generate SEO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generating SEO Metadata...</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Progress value={progress} className="w-full" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-muted-foreground">
                  Current: {currentProduct || "Processing..."}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={resetState}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              SEO Generation Complete!
            </DialogTitle>
          </DialogHeader>

          {finalResults && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>✓ Successfully updated:</span>
                  <span className="font-medium text-success">{finalResults.successCount} products</span>
                </div>
                
                {finalResults.errorCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>❌ Failed:</span>
                    <span className="font-medium text-destructive">{finalResults.errorCount} products</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span>⏱️ Total time:</span>
                  <span className="font-medium">{(finalResults.totalTime / 1000).toFixed(1)}s</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <p className="font-medium">Generated Fields:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Meta Descriptions: {finalResults.successCount}</li>
                  <li>• Meta Keywords: {finalResults.successCount}</li>
                  <li>• Image Alt Text: {finalResults.successCount}</li>
                  <li>• OG Images: {finalResults.results.filter(r => r.og_image).length}</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={resetState}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
