import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/lib/env";
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
      // Get current Supabase URL to verify session issuer
      const currentSupabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
      console.log('[AIContentGenerator] Current Supabase URL:', currentSupabaseUrl);
      
      // Get fresh session and ensure it's valid
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AIContentGenerator] Session error:', sessionError);
        toast({
          title: "Error",
          description: "Session error. Please log in again.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      
      // If no session, try to refresh
      if (!session) {
        console.log('[AIContentGenerator] No session, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('[AIContentGenerator] Refresh failed:', refreshError);
          toast({
            title: "Error",
            description: "You must be logged in. Please log in again.",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        
        session = refreshedSession;
      }
      
      // CRITICAL: Verify session issuer matches current Supabase project
      // Decode JWT to check issuer (without verification, just to read the payload)
      try {
        const tokenParts = session.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const tokenIssuer = payload.iss;
          const expectedIssuer = `${currentSupabaseUrl}/auth/v1`;
          
          console.log('[AIContentGenerator] Token issuer check:', {
            tokenIssuer,
            expectedIssuer,
            matches: tokenIssuer === expectedIssuer
          });
          
          if (tokenIssuer !== expectedIssuer) {
            console.error('[AIContentGenerator] Token issuer mismatch!', {
              tokenIssuer,
              expectedIssuer,
              currentSupabaseUrl
            });
            
            // Clear old session and force re-login
            await supabase.auth.signOut();
            
            toast({
              title: "Session Expired",
              description: "Your session is from a different project. Please log in again.",
              variant: "destructive",
            });
            
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/auth';
            }, 2000);
            
            setIsGenerating(false);
            return;
          }
        }
      } catch (decodeError) {
        console.error('[AIContentGenerator] Failed to decode token:', decodeError);
        // Continue anyway, let the server verify
      }
      
      // Check if token is expired or about to expire (within 1 minute)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      // If token expires in less than 1 minute, refresh it
      if (timeUntilExpiry < 60) {
        console.log('[AIContentGenerator] Token expiring soon, refreshing...', {
          expiresIn: timeUntilExpiry,
          expiresAt: new Date(expiresAt * 1000).toISOString()
        });
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('[AIContentGenerator] Token refresh failed:', refreshError);
          toast({
            title: "Error",
            description: "Session expired. Please log in again.",
            variant: "destructive",
          });
          setIsGenerating(false);
          return;
        }
        
        session = refreshedSession;
      }
      
      // Verify session is valid
      if (!session || !session.access_token) {
        console.error('[AIContentGenerator] Invalid session - no access token');
        toast({
          title: "Error",
          description: "Invalid session. Please log in again.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      
      console.log('[AIContentGenerator] Session verified:', {
        userId: session.user.id,
        email: session.user.email,
        tokenExpiresAt: new Date(session.expires_at! * 1000).toISOString(),
        expiresIn: Math.floor((session.expires_at! - now)),
        tokenLength: session.access_token.length,
        tokenPreview: session.access_token.substring(0, 20) + '...'
      });

      console.log('[AIContentGenerator] Calling Edge Function with:', {
        gameId: safeGameId,
        categoryId: safeCategoryId,
        productType,
        sourceUrl: sourceUrl.trim().substring(0, 50) + '...'
      });

      // Call Edge Function - Supabase client will automatically add Authorization header
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
        errorStringified: JSON.stringify(response.error, null, 2),
        data: response.data
      });

      if (response.error) {
        // Supabase client wraps errors - extract actual error details
        const errorObj = response.error as any;
        
        // Log FULL error structure first for debugging
        console.error('[AIContentGenerator] ===== FULL ERROR OBJECT =====');
        console.error('Error object:', errorObj);
        console.error('Error.context:', errorObj.context);
        console.error('Error.context.body type:', typeof errorObj.context?.body);
        console.error('Error.context.body is ReadableStream:', errorObj.context?.body instanceof ReadableStream);
        
        // Try multiple ways to extract error details
        let errorMessage = 'Failed to generate content';
        let errorHint = '';
        let errorCode = '';
        let fullErrorDetails: any = null;
        
        // Method 1: Read response body from context (which is a Response object)
        if (errorObj.context && typeof errorObj.context.text === 'function') {
          try {
            const bodyText = await errorObj.context.text();
            console.log('[AIContentGenerator] Read response body text:', bodyText);
            
            try {
              const body = JSON.parse(bodyText);
              fullErrorDetails = body;
              errorMessage = body.details || body.message || body.error || errorMessage;
              errorHint = body.hint || '';
              errorCode = body.errorCode || body.code || body.status || '';
              console.log('[AIContentGenerator] Extracted from context.text():', { errorMessage, errorHint, errorCode });
            } catch (parseError) {
              console.error('[AIContentGenerator] Failed to parse body as JSON:', parseError);
              errorMessage = bodyText || errorMessage;
            }
          } catch (textError) {
            console.error('[AIContentGenerator] Failed to read context.text():', textError);
          }
        }
        
        // Method 2: Read response body stream if it's a ReadableStream
        if (!fullErrorDetails && errorObj.context?.body instanceof ReadableStream) {
          try {
            const reader = errorObj.context.body.getReader();
            const { value, done } = await reader.read();
            if (!done && value) {
              const decoder = new TextDecoder();
              const bodyText = decoder.decode(value);
              console.log('[AIContentGenerator] Read response body stream:', bodyText);
              
              try {
                const body = JSON.parse(bodyText);
                fullErrorDetails = body;
                errorMessage = body.details || body.message || body.error || errorMessage;
                errorHint = body.hint || '';
                errorCode = body.errorCode || body.code || body.status || '';
                console.log('[AIContentGenerator] Extracted from ReadableStream body:', { errorMessage, errorHint, errorCode });
              } catch (parseError) {
                console.error('[AIContentGenerator] Failed to parse stream body as JSON:', parseError);
                errorMessage = bodyText || errorMessage;
              }
            }
            reader.releaseLock();
          } catch (streamError) {
            console.error('[AIContentGenerator] Failed to read stream:', streamError);
          }
        }
        
        // Method 3: Check context.response (if available)
        if (!fullErrorDetails && errorObj.context?.response) {
          try {
            const response = errorObj.context.response;
            if (response.body && typeof response.text === 'function') {
              const bodyText = await response.text();
              try {
                const body = JSON.parse(bodyText);
                fullErrorDetails = body;
                errorMessage = body.details || body.message || body.error || errorMessage;
                errorHint = body.hint || '';
                errorCode = body.errorCode || body.code || body.status || '';
                console.log('[AIContentGenerator] Extracted from context.response:', { errorMessage, errorHint, errorCode });
              } catch (parseError) {
                errorMessage = bodyText || errorMessage;
              }
            }
          } catch (e) {
            console.error('[AIContentGenerator] Failed to read context.response:', e);
          }
        }
        
        // Method 3: Check if context.body is already a string or object
        if (!fullErrorDetails && errorObj.context?.body && !(errorObj.context.body instanceof ReadableStream)) {
          try {
            const body = typeof errorObj.context.body === 'string' 
              ? JSON.parse(errorObj.context.body) 
              : errorObj.context.body;
            fullErrorDetails = body;
            errorMessage = body.details || body.message || body.error || errorMessage;
            errorHint = body.hint || '';
            errorCode = body.errorCode || body.code || body.status || '';
            console.log('[AIContentGenerator] Extracted from context.body (non-stream):', { errorMessage, errorHint, errorCode });
          } catch (e) {
            console.error('[AIContentGenerator] Failed to parse context.body:', e);
          }
        }
        
        // Method 4: Check error.message (might contain JSON)
        if (!fullErrorDetails && errorObj.message) {
          errorMessage = errorObj.message;
          // Try to parse if it's JSON
          try {
            const parsed = JSON.parse(errorObj.message);
            fullErrorDetails = parsed;
            errorMessage = parsed.details || parsed.message || parsed.error || errorMessage;
            errorHint = parsed.hint || '';
            errorCode = parsed.errorCode || parsed.code || '';
            console.log('[AIContentGenerator] Extracted from parsed error.message:', { errorMessage, errorHint, errorCode });
          } catch {
            // Not JSON, use as is
            console.log('[AIContentGenerator] error.message is not JSON, using as-is:', errorMessage);
          }
        }
        
        // Method 5: Check status code from context
        if (errorObj.context?.status) {
          errorCode = errorObj.context.status.toString();
          if (!errorMessage.includes('401') && errorCode === '401') {
            errorMessage = 'Authentication failed. Please log out and log back in.';
            errorHint = 'Your session may have expired. Try refreshing the page or logging in again.';
          }
        }
        
        // Build display message with all available info
        let displayMessage = errorMessage;
        if (errorHint) {
          displayMessage += `\n\n💡 ${errorHint}`;
        }
        if (errorCode) {
          displayMessage += `\n\nStatus Code: ${errorCode}`;
        }
        if (fullErrorDetails && Object.keys(fullErrorDetails).length > 0) {
          displayMessage += `\n\nFull details: ${JSON.stringify(fullErrorDetails, null, 2)}`;
        }
        
        console.error('[AIContentGenerator] Final extracted error:', {
          errorMessage,
          errorHint,
          errorCode,
          displayMessage,
          statusCode: errorObj.context?.status
        });
        
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
