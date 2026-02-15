import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  short_description: string | null;
  meta_title: string | null;
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

interface GenerationResult {
  product_id: string;
  product_name: string;
  status: 'generated' | 'skipped' | 'error';
  meta_title?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dryRun = true, productIds, updateMode = 'missing' } = await req.json();

    console.log(`Meta title generation - Mode: ${updateMode}, DryRun: ${dryRun}, ProductIds: ${productIds?.length || 'all'}`);

    // Build query for products
    let query = supabase
      .from('products')
      .select('id, name, short_description, meta_title, category_id');

    // If specific product IDs provided, filter by them
    if (productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    // Apply update mode filters
    if (updateMode === 'missing') {
      query = query.is('meta_title', null);
    } else if (updateMode === 'empty') {
      query = query.or('meta_title.is.null,meta_title.eq.');
    }
    // 'all' mode doesn't need additional filters

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        dryRun,
        totalProcessed: 0,
        results: [],
        message: 'No products found matching criteria'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch categories
    const categoryIds = [...new Set(products.map(p => p.category_id))];
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, game_id')
      .in('id', categoryIds);

    // Fetch games
    const gameIds = [...new Set(categories?.map(c => c.game_id) || [])];
    const { data: games } = await supabase
      .from('games')
      .select('id, name')
      .in('id', gameIds);

    const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);
    const gameMap = new Map(games?.map(g => [g.id, g]) || []);

    const results: GenerationResult[] = [];
    const startTime = Date.now();

    // Process products in batches of 10 with delays
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_PRODUCTS = 200; // 200ms between products
    const DELAY_BETWEEN_BATCHES = 1000; // 1s between batches

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      
      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        const category = categoryMap.get(product.category_id);
        const game = category ? gameMap.get(category.game_id) : null;

        try {
          const metaTitle = await generateMetaTitle(
            product,
            category || undefined,
            game || undefined,
            lovableApiKey
          );

          if (!dryRun && metaTitle) {
            // Save to database
            const { error: updateError } = await supabase
              .from('products')
              .update({ meta_title: metaTitle })
              .eq('id', product.id);

            if (updateError) {
              throw new Error(`Failed to update: ${updateError.message}`);
            }
          }

          results.push({
            product_id: product.id,
            product_name: product.name,
            status: 'generated',
            meta_title: metaTitle
          });
        } catch (error: any) {
          console.error(`Error processing ${product.name}:`, error);
          results.push({
            product_id: product.id,
            product_name: product.name,
            status: 'error',
            error: error.message
          });
        }

        // Add delay between products within batch
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PRODUCTS));
        }
      }

      // Add delay between batches
      if (i + BATCH_SIZE < products.length) {
        console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    const totalTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      totalProcessed: results.length,
      successCount: results.filter(r => r.status === 'generated').length,
      errorCount: results.filter(r => r.status === 'error').length,
      totalTime,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Meta title generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateMetaTitle(
  product: Product,
  category: Category | undefined,
  game: Game | undefined,
  apiKey: string
): Promise<string> {
  const gameName = game?.name || 'Gaming';
  const categoryName = category?.name || 'Service';
  const productName = product.name;
  const shortDesc = product.short_description || '';

  const prompt = `Generate an SEO-optimized meta title for this gaming service product.

CRITICAL REQUIREMENTS:
- Maximum 60 characters total (including brand suffix)
- The title MUST end with " | misti.services" (exactly 17 characters)
- So you have exactly 43 characters for the product-specific content
- Include the game name if it fits
- Start with an action word or the main keyword
- Be compelling and click-worthy for search results
- Do NOT use quotes or special formatting

Product Details:
- Product: ${productName}
- Game: ${gameName}
- Category: ${categoryName}
- Description: ${shortDesc.substring(0, 150)}

Examples of good meta titles:
- "Buy WoW Boosting - Fast & Safe | misti.services" (47 chars)
- "LoL Ranked Boost - Pro Players | misti.services" (47 chars)
- "Diablo 4 Power Leveling Service | misti.services" (49 chars)

Return ONLY the complete meta title text, nothing else. Do not include quotes.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert specializing in gaming services. Generate concise, compelling meta titles that rank well in Google and drive clicks. Always follow character limits precisely.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let metaTitle = data.choices?.[0]?.message?.content?.trim() || '';

  // Clean up the response - remove quotes if present
  metaTitle = metaTitle.replace(/^["']|["']$/g, '').trim();

  // Ensure it doesn't exceed 60 characters
  if (metaTitle.length > 60) {
    // Try to truncate intelligently
    const brandSuffix = ' | misti.services';
    const contentPart = metaTitle.replace(brandSuffix, '').trim();
    const maxContentLength = 60 - brandSuffix.length;
    const truncatedContent = contentPart.substring(0, maxContentLength).trim();
    metaTitle = `${truncatedContent}${brandSuffix}`;
  }

  // Ensure it has the brand suffix
  if (!metaTitle.includes('misti.services')) {
    const brandSuffix = ' | misti.services';
    const maxContentLength = 60 - brandSuffix.length;
    const content = metaTitle.substring(0, maxContentLength).trim();
    metaTitle = `${content}${brandSuffix}`;
  }

  return metaTitle;
}
