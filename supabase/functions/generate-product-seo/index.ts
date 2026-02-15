import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  dryRun?: boolean;
  batchSize?: number;
  startIndex?: number;
  productIds?: string[];
  updateMode?: 'all' | 'missing' | 'empty_all';
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  image_url: string;
  meta_description: string | null;
  meta_keywords: string | null;
  image_alt_text: string | null;
  og_image: string | null;
  categories: Array<{
    name: string;
    games: Array<{
      name: string;
    }>;
  }>;
}

// Text processing utilities
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

function extractServiceType(name: string): string {
  const lowercaseName = name.toLowerCase();
  
  const types = [
    'boost', 'campaign', 'reputation', 'mount', 'achievement', 
    'leveling', 'glory', 'raid', 'dungeon', 'mythic', 'pvp',
    'renown', 'timewalking', 'transmog', 'pet'
  ];
  
  for (const type of types) {
    if (lowercaseName.includes(type)) return type;
  }
  
  return 'gaming service';
}

function generateMetaDescription(
  product: Product, 
  gameName: string, 
  serviceType: string
): string {
  // Priority 1: Use short_description if valid length
  if (product.short_description) {
    const cleaned = stripHtml(product.short_description);
    if (cleaned.length >= 50 && cleaned.length <= 160) {
      return truncateAtWord(cleaned, 160);
    }
  }
  
  // Priority 2: Extract from description
  if (product.description) {
    const cleaned = stripHtml(product.description);
    const firstSentence = cleaned.split(/[.!?]/)[0];
    
    if (firstSentence.length >= 50 && firstSentence.length <= 160) {
      return firstSentence + '.';
    }
    
    if (cleaned.length >= 50) {
      return truncateAtWord(cleaned, 157) + '.';
    }
  }
  
  // Priority 3: Fallback template
  return `Buy ${serviceType} for ${gameName} fast and safely at Misti Services. Professional players, quick delivery — start your boost today!`;
}

async function generateKeywords(product: Product, gameName: string): Promise<string[]> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.warn('[SEO-GEN] LOVABLE_API_KEY not found, using fallback');
      return generateFallbackKeywords(product, gameName);
    }

    // Construct AI prompt using user's optimized template
    const prompt = `Generate a list of 10–15 SEO keywords for this product. 
Focus on unique, relevant keywords directly connected to the product title and short description. 
Avoid generic or repeated terms that could apply to any product. 
Include both short-tail and long-tail keywords that potential customers would search for.

Base the keywords on:
- Main product name and its specific version (e.g., expansion, mode, class, or game)
- Key features or bonuses mentioned in the short description
- Related search intent (buy, boost, guide, service, cheap, fast, professional, etc.)

Product Title: ${product.name}
Short Description: ${product.short_description || 'N/A'}
Game: ${gameName}

Format: Return ONLY a clean, comma-separated list without hashtags, numbering, or explanations.

Example format: wow classic leveling boost, classic wow 1-60 boost, hand leveled service, dual spec included, fast wow leveling`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an SEO keyword specialist. Generate unique, relevant keywords based on product information. Return only comma-separated keywords without any additional text or formatting.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[SEO-GEN] Rate limit hit, using fallback');
        return generateFallbackKeywords(product, gameName);
      }
      if (response.status === 402) {
        console.warn('[SEO-GEN] Payment required, using fallback');
        return generateFallbackKeywords(product, gameName);
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();
    
    if (!generatedText) {
      console.warn('[SEO-GEN] Empty AI response, using fallback');
      return generateFallbackKeywords(product, gameName);
    }

    // Parse comma-separated keywords
    let keywords = generatedText
      .split(',')
      .map((k: string) => k.trim().toLowerCase())
      .filter((k: string) => k.length > 0 && k.length < 60);

    // Validate: need at least 10 keywords for quality
    if (keywords.length < 10) {
      console.warn(`[SEO-GEN] AI returned only ${keywords.length} keywords, supplementing with fallback`);
      
      // Supplement with fallback keywords to reach minimum 10
      const fallbackKeywords = generateFallbackKeywords(product, gameName);
      const combined = [...keywords, ...fallbackKeywords];
      
      // Remove duplicates and ensure we have 10-15 keywords
      const uniqueKeywords = Array.from(new Set(combined));
      return uniqueKeywords.slice(0, 15);
    }

    // Return 10-15 keywords
    return keywords.slice(0, 15);

  } catch (error) {
    console.error('[SEO-GEN] Error generating AI keywords:', error);
    return generateFallbackKeywords(product, gameName);
  }
}

function generateFallbackKeywords(product: Product, gameName: string): string[] {
  const keywords = new Set<string>();
  
  // Extract meaningful terms from product name
  const nameParts = product.name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  nameParts.forEach(word => keywords.add(word));
  keywords.add(gameName.toLowerCase());
  
  // Add service type
  const serviceType = extractServiceType(product.name);
  keywords.add(serviceType);
  keywords.add(`${gameName.toLowerCase()} ${serviceType}`);
  
  return Array.from(keywords).slice(0, 10);
}

function generateAltText(
  product: Product, 
  gameName: string, 
  serviceType: string
): string {
  try {
    // Try to build from components
    const specificFeature = product.name
      .replace(new RegExp(gameName, 'gi'), '')
      .replace(/boost/gi, '')
      .trim();
    
    const altText = `${gameName} ${serviceType} - ${specificFeature}`;
    
    if (altText.length <= 125) {
      return altText;
    }
    
    return truncateAtWord(altText, 125);
  } catch {
    // Fallback
    return `${product.name} boost service – Misti Services`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { dryRun = true, batchSize = 10, startIndex = 0, productIds, updateMode = 'missing' }: RequestBody = await req.json();
    console.log(`[SEO-GEN] Starting ${dryRun ? 'preview' : 'update'} mode with updateMode: ${updateMode}`);

    // Fetch products with categories and games
    let query = supabase
      .from('products')
      .select(`
        id, name, slug, description, short_description, image_url,
        meta_description, meta_keywords, image_alt_text, og_image,
        categories!inner(name, games!inner(name))
      `)
      .order('name');
    
    if (productIds?.length) {
      query = query.in('id', productIds);
    }
    
    const { data: products, error: productsError } = await query;
    
    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ error: 'No products found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter products based on update mode
    let filteredProducts = products;

    if (updateMode === 'missing') {
      // Products missing ANY critical SEO field (og_image excluded - auto-populated from image_url)
      filteredProducts = products.filter(p => 
        !p.meta_description || 
        !p.meta_keywords || 
        !p.image_alt_text
      );
    } else if (updateMode === 'empty_all') {
      // Products missing ALL critical SEO fields
      filteredProducts = products.filter(p => 
        !p.meta_description && 
        !p.meta_keywords && 
        !p.image_alt_text
      );
    } else if (updateMode === 'all') {
      // All products - no filtering
      filteredProducts = products;
    }

    console.log(`[SEO-GEN] Filtered ${filteredProducts.length}/${products.length} products for ${updateMode} mode`);

    // Process in batches
    const results = [];
    const startTime = Date.now();
    
    for (let i = startIndex; i < filteredProducts.length; i += batchSize) {
      const batch = filteredProducts.slice(i, Math.min(i + batchSize, filteredProducts.length));
      
      for (const product of batch) {
        const processingStart = Date.now();
        
        try {
          const gameName = product.categories[0]?.games?.[0]?.name || 'Game';
          const serviceType = extractServiceType(product.name);
          
          console.log(`[SEO-GEN] Processing ${i + 1}/${filteredProducts.length}: ${product.name} - Generating AI keywords...`);
          
          // Generate SEO fields
          const keywords = await generateKeywords(product, gameName);
          const newSeoData = {
            meta_description: generateMetaDescription(product, gameName, serviceType),
            meta_keywords: keywords.join(', '),
            image_alt_text: generateAltText(product, gameName, serviceType),
            og_image: product.image_url || null
          };
          
          // Log to audit table
          const { error: logError } = await supabase.from('seo_generation_logs').insert({
            product_id: product.id,
            operation_type: dryRun ? 'preview' : 'update',
            old_values: {
              meta_description: product.meta_description,
              meta_keywords: product.meta_keywords,
              image_alt_text: product.image_alt_text,
              og_image: product.og_image
            },
            new_values: newSeoData,
            status: 'success',
            processing_time_ms: Date.now() - processingStart,
            created_by: user.id
          });

          if (logError) {
            console.error('[SEO-GEN] Log error:', logError);
          }
          
          // Update product if not dry run
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('products')
              .update(newSeoData)
              .eq('id', product.id);
            
            if (updateError) throw updateError;
          }
          
          results.push({
            product_id: product.id,
            product_name: product.name,
            status: 'success',
            ...newSeoData
          });
          
        } catch (error) {
          console.error('[SEO-GEN] Error processing product:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Log error
          await supabase.from('seo_generation_logs').insert({
            product_id: product.id,
            operation_type: dryRun ? 'preview' : 'update',
            old_values: {
              meta_description: product.meta_description,
              meta_keywords: product.meta_keywords,
              image_alt_text: product.image_alt_text,
              og_image: product.og_image
            },
            new_values: {},
            status: 'error',
            error_message: errorMessage,
            processing_time_ms: Date.now() - processingStart,
            created_by: user.id
          });
          
          results.push({
            product_id: product.id,
            product_name: product.name,
            status: 'error',
            error: errorMessage
          });
        }
        
        // Add delay between products to avoid rate limits
        const isLastProductInBatch = product === batch[batch.length - 1];
        const hasMoreProducts = i + batchSize < filteredProducts.length;
        if (!isLastProductInBatch || hasMoreProducts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Rate limiting: delay between batches
      if (i + batchSize < filteredProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`[SEO-GEN] Complete: ${successCount} success, ${errorCount} errors, ${totalTime}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      dryRun,
      totalProcessed: results.length,
      successCount,
      errorCount,
      totalTime,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[SEO-GEN] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
