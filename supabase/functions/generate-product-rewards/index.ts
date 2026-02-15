import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRewardsRequest {
  scope: 'game' | 'category' | 'product';
  gameId?: string;
  categoryId?: string;
  productId?: string;
  dryRun?: boolean;
  regenerate?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GenerateRewardsRequest = await req.json();
    const { scope, gameId, categoryId, productId, dryRun = false, regenerate = false } = body;

    // Get game and category context
    let gameContext = '';
    let categoryContext = '';

    if (gameId) {
      const { data: game } = await supabase
        .from('games')
        .select('name, description')
        .eq('id', gameId)
        .single();
      if (game) {
        gameContext = `Game: ${game.name}. ${game.description || ''}`;
      }
    }

    if (categoryId) {
      const { data: category } = await supabase
        .from('categories')
        .select('name, description')
        .eq('id', categoryId)
        .single();
      if (category) {
        categoryContext = `Category: ${category.name}. ${category.description || ''}`;
      }
    }

    // Build product query based on scope
    let productsQuery = supabase
      .from('products')
      .select(`
        id, name, description, short_description, base_price,
        delivery_text, start_time_text,
        category:categories!inner(id, name, game_id, games:game_id(name))
      `)
      .eq('is_active', true);

    if (scope === 'product' && productId) {
      productsQuery = productsQuery.eq('id', productId);
    } else if (scope === 'category' && categoryId) {
      productsQuery = productsQuery.eq('category_id', categoryId);
    } else if (scope === 'game' && gameId) {
      productsQuery = productsQuery.eq('category.game_id', gameId);
    }

    const { data: products, error: productsError } = await productsQuery;

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No products found for the selected scope',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{
      productId: string;
      productName: string;
      status: 'generated' | 'skipped' | 'error' | 'preview';
      content?: string;
      error?: string;
    }> = [];

    for (const product of products) {
      const startTime = Date.now();

      try {
        // Check if rewards already exist
        if (!regenerate) {
          const { data: existing } = await supabase
            .from('product_rewards')
            .select('id')
            .eq('product_id', product.id)
            .single();

          if (existing) {
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'skipped',
            });
            continue;
          }
        }

        const gameName = (product.category as any)?.games?.name || '';
        const categoryName = (product.category as any)?.name || '';

        const systemPrompt = `You are a concise copywriter for a gaming services marketplace. Generate a single rewards/benefits section.

PRODUCT INFO:
- Game: ${gameName}
- Category: ${categoryName}
- Product: ${product.name}
- Description: ${product.description || product.short_description || 'N/A'}
- Delivery: ${product.delivery_text || 'Fast delivery'}
- Start Time: ${product.start_time_text || 'Quick start'}

TASK:
Create ONE "What You Get" section that summarizes the key benefits, service inclusions, and rewards from the product description above. Extract the most important selling points.

RULES:
- 150-200 words maximum
- Use bullet points for clarity
- Extract real benefits from the product description
- Include service guarantees, bonuses, and perks
- NO generic filler - only specific value points

FORMAT: HTML with single <h4>What You Get</h4> heading and <ul><li> bullets.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "rewards_content": "<h4>What You Get</h4><ul><li>...</li><li>...</li></ul>"
}`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate rewards content for: ${product.name}` }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: 'Rate limit exceeded. Please try again later.',
            });
            continue;
          }
          if (response.status === 402) {
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: 'API credits exhausted. Please add funds.',
            });
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('No content in AI response');
        }

        // Parse JSON from response
        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Content:', content);
          throw new Error('Failed to parse AI response');
        }

        if (dryRun) {
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'preview',
            content: parsed.rewards_content,
          });
        } else {
          // Delete existing if regenerating
          if (regenerate) {
            await supabase
              .from('product_rewards')
              .delete()
              .eq('product_id', product.id);
          }

          // Insert new rewards
          const { error: insertError } = await supabase
            .from('product_rewards')
            .insert({
              product_id: product.id,
              rewards_content: parsed.rewards_content,
              is_approved: false,
              generated_at: new Date().toISOString(),
            });

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          results.push({
            productId: product.id,
            productName: product.name,
            status: 'generated',
            content: parsed.rewards_content,
          });
        }

      } catch (error) {
        console.error(`Error processing ${product.name}:`, error);
        results.push({
          productId: product.id,
          productName: product.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const generated = results.filter(r => r.status === 'generated').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    const previews = results.filter(r => r.status === 'preview').length;

    return new Response(JSON.stringify({
      success: true,
      processed: products.length,
      generated,
      skipped,
      errors,
      previews,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate rewards error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
