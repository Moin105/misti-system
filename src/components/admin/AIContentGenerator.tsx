import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export interface GeneratedFields {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  how_it_works: string;
  requirements: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  image_alt_text: string;
  base_price: number;
  slider_config?: {
    slider_type?: string;
    value_label?: string;
    min_value?: number;
    max_value?: number;
    default_value?: number;
    default_start?: number;
    default_end?: number;
    step?: number;
    start_label?: string;
    end_label?: string;
    price_per_step?: number;
    estimated_time_per_step?: number;
  } | null;
  faqs?: Array<{ question: string; answer: string }>;
}

interface ExistingProduct {
  name: string;
  slug: string;
  base_price: string;
}

interface AIContentGeneratorProps {
  gameId: string;
  categoryId: string;
  gameName?: string;
  categoryName?: string;
  productType: 'simple' | 'single_slider' | 'multi_range';
  onFieldsGenerated: (fields: GeneratedFields) => void;
  disabled?: boolean;
  isEditMode?: boolean;
  existingProduct?: ExistingProduct;
}

export const AIContentGenerator = ({
  gameId,
  categoryId,
  gameName,
  categoryName,
  productType,
  onFieldsGenerated,
  disabled = false,
  isEditMode = false,
  existingProduct,
}: AIContentGeneratorProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [regionPlatform, setRegionPlatform] = useState("");
  
  // Preservation options (only used in edit mode)
  const [preserveSlug, setPreserveSlug] = useState(true); // Default: preserve slug for SEO
  const [preserveName, setPreserveName] = useState(false);
  const [preservePrice, setPreservePrice] = useState(false);

  const handleGenerate = async () => {
    if (!sourceUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a competitor URL",
        variant: "destructive",
      });
      return;
    }

    // Ensure gameId and categoryId are strings and not null
    const safeGameId = gameId ? String(gameId) : null;
    const safeCategoryId = categoryId ? String(categoryId) : null;

    if (!safeGameId || !safeCategoryId) {
      toast({
        title: "Error",
        description: "Please select a game and category first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      console.log('[AIContentGenerator] Calling Edge Function with:', {
        gameId: safeGameId,
        categoryId: safeCategoryId,
        productType,
        sourceUrl: sourceUrl.trim().substring(0, 50) + '...'
      });

      const response = await supabase.functions.invoke('generate-product-fields', {
        body: {
          sourceUrl: sourceUrl.trim(),
          gameId: safeGameId,
          categoryId: safeCategoryId,
          productType,
          gameName: gameName || undefined,
          categoryName: categoryName || undefined,
          regionPlatform: regionPlatform.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      console.log('[AIContentGenerator] Edge Function response:', {
        hasError: !!response.error,
        hasData: !!response.data,
        error: response.error,
        data: response.data
      });

      if (response.error) {
        // Extract detailed error information from the response
        const errorDetails = (response.error as any)?.context?.body || response.error;
        const errorMessage = errorDetails?.details || errorDetails?.message || response.error.message || 'Failed to generate content';
        const errorHint = errorDetails?.hint || '';
        const errorCode = errorDetails?.errorCode || errorDetails?.code || '';
        const fullError = errorDetails?.fullError || '';
        
        console.error('[AIContentGenerator] Detailed error:', {
          message: errorMessage,
          hint: errorHint,
          code: errorCode,
          fullError: fullError,
          originalError: response.error
        });
        
        // Show detailed error message
        const displayMessage = errorHint 
          ? `${errorMessage}\n\n💡 ${errorHint}` 
          : errorMessage;
        
        throw new Error(displayMessage);
      }

      const data = response.data;
      console.log('AI Content Generator - Raw response:', data);

      if (!data.success || !data.fields) {
        throw new Error(data.error || 'Failed to generate content');
      }

      console.log('AI Content Generator - Fields to populate:', data.fields);

      // Apply preservation logic in edit mode
      const fieldsToUpdate = { ...data.fields };
      
      if (isEditMode && existingProduct) {
        if (preserveSlug && existingProduct.slug) {
          fieldsToUpdate.slug = existingProduct.slug;
        }
        if (preserveName && existingProduct.name) {
          fieldsToUpdate.name = existingProduct.name;
        }
        if (preservePrice && existingProduct.base_price) {
          fieldsToUpdate.base_price = parseFloat(existingProduct.base_price);
        }
      }

      // Call the callback with the generated fields
      try {
        await onFieldsGenerated(fieldsToUpdate);
        console.log('AI Content Generator - onFieldsGenerated completed');
      } catch (callbackError) {
        console.error('AI Content Generator - Error in onFieldsGenerated callback:', callbackError);
        throw new Error('Failed to populate form fields');
      }

      toast({
        title: isEditMode ? "Content Rewritten!" : "Content Generated!",
        description: isEditMode 
          ? "Product content has been updated. Review and save when ready."
          : "All fields have been populated. Review and save when ready.",
      });

      // Reset the form
      setSourceUrl("");
      setNotes("");
      setRegionPlatform("");
      setIsOpen(false);

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = gameId && categoryId && sourceUrl.trim();

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen} 
      className={`border rounded-lg ${isEditMode ? 'bg-amber-500/5 border-amber-500/30' : 'bg-muted/30'}`}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {isEditMode ? "AI Content Rewriter" : "AI Content Generator"}
            </span>
            {isEditMode && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                Rewrite Mode
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {isEditMode 
                ? "(Rewrite content from new competitor URL)" 
                : "(Generate from competitor URL)"}
            </span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="text-sm text-muted-foreground">
          {isEditMode 
            ? "Paste a new competitor URL to rewrite this product's content. Use the checkboxes below to preserve certain fields."
            : "Paste a competitor's product URL to generate all product content using AI. Content will be original and optimized for SEO."}
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ai-source-url">Competitor Product URL *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="ai-source-url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://competitor-site.com/product-page"
                className="flex-1"
              />
              {sourceUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(sourceUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ai-region">Region/Platform (optional)</Label>
              <Input
                id="ai-region"
                value={regionPlatform}
                onChange={(e) => setRegionPlatform(e.target.value)}
                placeholder="e.g., US/EU, PC/Console"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ai-notes">Additional Context (optional)</Label>
              <Input
                id="ai-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Focus on speed, include bundles"
                className="mt-1"
              />
            </div>
          </div>

          {/* Preservation Options - Only shown in edit mode */}
          {isEditMode && existingProduct && (
            <div className="space-y-2 border-t pt-3 mt-3">
              <Label className="text-sm font-medium">Preserve Fields (keep existing values)</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="preserve-slug"
                    checked={preserveSlug}
                    onCheckedChange={(checked) => setPreserveSlug(checked === true)}
                  />
                  <Label htmlFor="preserve-slug" className="text-sm cursor-pointer">
                    Keep current URL slug
                    <span className="text-xs text-muted-foreground ml-1">(SEO important)</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="preserve-name"
                    checked={preserveName}
                    onCheckedChange={(checked) => setPreserveName(checked === true)}
                  />
                  <Label htmlFor="preserve-name" className="text-sm cursor-pointer">
                    Keep product name
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="preserve-price"
                    checked={preservePrice}
                    onCheckedChange={(checked) => setPreservePrice(checked === true)}
                  />
                  <Label htmlFor="preserve-price" className="text-sm cursor-pointer">
                    Keep base price
                  </Label>
                </div>
              </div>
              {existingProduct.slug && preserveSlug && (
                <p className="text-xs text-muted-foreground">
                  Current slug: <code className="bg-muted px-1 rounded">{existingProduct.slug}</code>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Rewriting Content..." : "Generating Content..."}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEditMode ? "Rewrite Content" : "Generate All Fields"}
                </>
              )}
            </Button>
          </div>

          {!gameId || !categoryId ? (
            <p className="text-xs text-amber-600">
              ⚠️ Select a game and category above before generating content
            </p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
