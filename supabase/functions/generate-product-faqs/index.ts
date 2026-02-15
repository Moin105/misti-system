import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateFAQsRequest {
  scope: "game" | "category" | "product";
  gameId: string;
  categoryId?: string;
  productId?: string;
  dryRun?: boolean;
  regenerate?: boolean;
  questionsCount?: number;
}

interface ProductData {
  id: string;
  name: string;
  short_description: string;
  description: string;
  requirements: string;
  how_it_works: string;
  base_price: number;
  start_time_text: string;
  delivery_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
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

    const body: GenerateFAQsRequest = await req.json();
    const {
      scope,
      gameId,
      categoryId,
      productId,
      dryRun = false,
      regenerate = false,
      questionsCount = 6
    } = body;

    if (!gameId) {
      return new Response(JSON.stringify({ error: 'gameId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    // Fetch game context for better AI prompts
    const { data: gameData } = await supabase
      .from('games')
      .select('name, description')
      .eq('id', gameId)
      .single();

    const gameName = gameData?.name || 'Game';

    // Fetch category context if applicable
    let categoryName = '';
    let categoryDescription = '';
    if (categoryId) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name, description')
        .eq('id', categoryId)
        .single();
      
      categoryName = categoryData?.name || '';
      categoryDescription = categoryData?.description || '';
    }

    // Build query based on scope
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        short_description,
        description,
        requirements,
        how_it_works,
        base_price,
        start_time_text,
        delivery_text,
        categories!inner(
          id,
          name,
          description,
          games!inner(id, name)
        )
      `)
      .eq('is_active', true);

    if (scope === "game") {
      query = query.eq('categories.games.id', gameId);
    } else if (scope === "category" && categoryId) {
      query = query.eq('category_id', categoryId);
    } else if (scope === "product" && productId) {
      query = query.eq('id', productId);
    } else {
      return new Response(JSON.stringify({ 
        error: 'Invalid scope or missing required parameters' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: products, error: productsError } = await query.order('name');
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        generated: 0,
        skipped: 0,
        results: [],
        message: 'No products found for the selected scope'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${products.length} products in ${scope} scope`);

    const results = [];
    let totalGenerated = 0;
    let totalSkipped = 0;

    for (const product of products) {
      try {
        // Check if FAQs already exist
        if (!regenerate) {
          const { data: existingFAQs } = await supabase
            .from('product_faqs')
            .select('id')
            .eq('product_id', product.id)
            .limit(1);

          if (existingFAQs && existingFAQs.length > 0) {
            totalSkipped++;
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'skipped',
              questionsGenerated: 0,
              message: 'FAQs already exist'
            });
            continue;
          }
        }

        const productCategoryName = (product.categories as any)?.name || categoryName || 'Service';
        
        // Build enhanced system prompt with scope-specific context
        let systemPrompt = `You are an SEO expert creating FAQ sections for gaming service products.

Rules:
- Generate ${questionsCount} questions that customers commonly ask
- Focus on: pricing, delivery time, safety, guarantees, requirements, process
- Use natural language that matches search intent
- Answers should be 2-4 sentences, informative but concise
- Include relevant keywords naturally without keyword stuffing
- Address objections and build trust
- Make questions specific to this product and category

Game Context:
Game: ${gameName}

Category Context:
Category: ${productCategoryName}`;

        if (categoryDescription) {
          systemPrompt += `\nCategory Description: ${categoryDescription}`;
        }

        systemPrompt += `

Product Context:
Name: ${product.name}
Description: ${product.short_description || 'Gaming service'}
Base Price: $${product.base_price}
Start Time: ${product.start_time_text || 'Quick'}
Delivery: ${product.delivery_text || 'Flexible'}

${product.description ? `Full Description: ${product.description}` : ''}
${product.requirements ? `Requirements: ${product.requirements}` : ''}
${product.how_it_works ? `How It Works: ${product.how_it_works}` : ''}

Generate questions that help customers make informed purchase decisions for this specific ${productCategoryName} service in ${gameName}.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Generate the FAQ questions and answers." }
            ],
            tools: [{
              type: "function",
              function: {
                name: "generate_faqs",
                description: "Generate FAQ questions and answers",
                parameters: {
                  type: "object",
                  properties: {
                    faqs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" }
                        },
                        required: ["question", "answer"]
                      }
                    }
                  },
                  required: ["faqs"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "generate_faqs" } }
          })
        });

        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        if (response.status === 402) {
          throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || !toolCall.function || typeof toolCall.function.arguments !== 'string') {
          console.error('Unexpected AI tool call structure:', JSON.stringify(data, null, 2));
          throw new Error('Unexpected AI response format while generating FAQs');
        }

        let faqs: any[] = [];
        try {
          const faqsData = JSON.parse(toolCall.function.arguments);
          faqs = Array.isArray(faqsData.faqs) ? faqsData.faqs : [];
        } catch (parseError) {
          console.error('Failed to parse AI tool arguments:', parseError, toolCall.function.arguments);
          throw new Error('Failed to parse AI response while generating FAQs');
        }

        if (!faqs.length) {
          throw new Error('AI did not return any FAQs');
        }

        if (!dryRun && faqs.length > 0) {
          // Delete existing FAQs if regenerating
          if (regenerate) {
            await supabase
              .from('product_faqs')
              .delete()
              .eq('product_id', product.id);
          }

          // Insert new FAQs
          const faqsToInsert = faqs.map((faq: any, index: number) => ({
            product_id: product.id,
            question: faq.question,
            answer: faq.answer,
            sort_order: index,
            generated_by: 'ai',
            is_active: true
          }));

          const { error: insertError } = await supabase
            .from('product_faqs')
            .insert(faqsToInsert);

          if (insertError) {
            throw insertError;
          }

          // Log the generation
          await supabase
            .from('faq_generation_logs')
            .insert({
              product_id: product.id,
              operation_type: `${scope}_${regenerate ? 'regenerate' : 'generate'}`,
              status: 'success',
              questions_generated: faqs.length,
              processing_time_ms: Date.now() - startTime,
              created_by: user.id
            });
        }

        totalGenerated++;
        results.push({
          productId: product.id,
          productName: product.name,
          status: dryRun ? 'preview' : 'success',
          questionsGenerated: faqs.length,
          faqs: dryRun ? faqs : undefined
        });

        // Add small delay between products to avoid rate limits
        if (products.indexOf(product) < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error: any) {
        console.error(`Error generating FAQs for product ${product.id}:`, error);
        
        // Log the error
        if (!dryRun) {
          await supabase
            .from('faq_generation_logs')
            .insert({
              product_id: product.id,
              operation_type: `${scope}_${regenerate ? 'regenerate' : 'generate'}`,
              status: 'error',
              questions_generated: 0,
              error_message: error?.message || 'Unknown error',
              processing_time_ms: Date.now() - startTime,
              created_by: user.id
            });
        }

        results.push({
          productId: product.id,
          productName: product.name,
          status: 'error',
          questionsGenerated: 0,
          error: error?.message || 'Unknown error'
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      processed: products.length,
      generated: totalGenerated,
      skipped: totalSkipped,
      processingTimeMs: processingTime,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-product-faqs:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
