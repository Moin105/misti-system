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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseUrl) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'SUPABASE_URL environment variable is missing',
        hint: 'Set SUPABASE_URL in Edge Function environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try both possible secret names (Supabase may block SUPABASE_ prefix)
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Service role key environment variable is missing. Checked both SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY.',
        hint: 'Set SERVICE_ROLE_KEY in Supabase Dashboard → Edge Functions → Settings → Secrets. Get the RAW key from Dashboard → Settings → API → service_role key (copy it EXACTLY as-is, do NOT encrypt/hash it).'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OPENAI_API_KEY not configured',
        details: 'OPENAI_API_KEY environment variable is missing',
        hint: 'Set OPENAI_API_KEY in Edge Function environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.length < 10) {
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization token',
        details: 'Token is missing or too short',
        hint: 'Make sure Authorization header contains a valid Bearer token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create service role client for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user is authenticated using token directly
    console.log('[AUTH] Verifying JWT token...', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...',
      supabaseUrl: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    let user, userError;
    try {
      const authResult = await supabaseAuth.auth.getUser(token);
      user = authResult.data?.user;
      userError = authResult.error;
      
      console.log('[AUTH] getUser result:', {
        hasUser: !!user,
        hasError: !!userError,
        errorMessage: userError?.message,
        userId: user?.id
      });
    } catch (authException) {
      console.error('[AUTH EXCEPTION] Exception during getUser:', {
        error: authException instanceof Error ? authException.message : String(authException),
        stack: authException instanceof Error ? authException.stack : undefined
      });
      return new Response(JSON.stringify({ 
        error: 'Authentication exception',
        details: authException instanceof Error ? authException.message : 'Unknown exception during token verification',
        hint: 'Check function logs for more details'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (userError) {
      console.error('[AUTH ERROR] JWT verification failed:', {
        message: userError.message,
        status: userError.status,
        name: userError.name,
        code: (userError as any).code,
        tokenPreview: token.substring(0, 30) + '...',
        fullError: JSON.stringify(userError, Object.getOwnPropertyNames(userError))
      });
      return new Response(JSON.stringify({ 
        error: 'Invalid JWT', 
        details: userError.message || 'JWT verification failed',
        errorCode: userError.status || (userError as any).code || 'unknown',
        errorName: userError.name || 'AuthError',
        fullError: JSON.stringify(userError, Object.getOwnPropertyNames(userError)),
        hint: 'Token may be expired, invalid, or malformed. Try logging out and logging back in.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!user) {
      console.error('[AUTH ERROR] User is null after successful token verification');
      return new Response(JSON.stringify({ 
        error: 'User not found', 
        details: 'Token verified but user data is missing',
        hint: 'User may have been deleted or token is invalid'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[AUTH] User verified:', { id: user.id, email: user.email });

    // Check admin role - try RPC first, fallback to direct query if RPC fails
    console.log('[AUTH] Checking admin role for user:', user.id);
    
    let isAdmin = false;
    let roleError: any = null;
    
    try {
      console.log('[AUTH] Attempting has_role RPC call...');
      const rpcResult = await supabaseAuth.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      
      console.log('[AUTH] RPC result:', {
        data: rpcResult.data,
        hasError: !!rpcResult.error,
        errorMessage: rpcResult.error?.message,
        errorCode: rpcResult.error?.code
      });
      
      isAdmin = rpcResult.data === true;
      roleError = rpcResult.error;
      
      if (roleError) {
        console.error('[AUTH] RPC has_role failed:', {
          message: roleError.message,
          code: roleError.code,
          details: roleError.details,
          hint: roleError.hint
        });
      } else {
        console.log('[AUTH] Admin check via RPC successful:', isAdmin);
      }
    } catch (rpcException) {
      console.error('[AUTH] RPC exception:', {
        error: rpcException instanceof Error ? rpcException.message : String(rpcException),
        stack: rpcException instanceof Error ? rpcException.stack : undefined
      });
      roleError = rpcException;
    }
    
    // Fallback: Direct query if RPC fails (service role bypasses RLS)
    if (roleError || isAdmin === null || isAdmin === undefined) {
      console.log('[AUTH] Falling back to direct user_roles query with service role');
      
      const { data: roleData, error: queryError } = await supabaseAuth
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      console.log('[AUTH] Direct query result:', {
        data: roleData,
        hasError: !!queryError,
        errorMessage: queryError?.message,
        errorCode: queryError?.code
      });
      
      if (queryError) {
        console.error('[AUTH ERROR] Both RPC and direct query failed:', {
          rpcError: roleError?.message || roleError,
          queryError: queryError.message,
          queryCode: queryError.code,
          queryDetails: queryError.details,
          queryHint: queryError.hint
        });
        
        if (queryError.code === '42501' || queryError.message?.includes('permission denied')) {
          return new Response(JSON.stringify({ 
            error: 'Permission denied - Service role key issue',
            details: `Both RPC and direct query failed with "permission denied for schema public" (code: 42501). This indicates the service role key is either missing, incorrect, or the key does not have proper permissions.`,
            errorCode: queryError.code || '42501',
            hint: 'CRITICAL: Set SERVICE_ROLE_KEY in Supabase Dashboard → Edge Functions → Settings → Secrets. Get the key from Dashboard → Settings → API → service_role key. Also run the SQL from FIX_ALL_EDGE_FUNCTIONS_DB_PERMISSIONS.md'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          error: 'Failed to verify admin role',
          details: `RPC error: ${roleError?.message || 'unknown'}, Query error: ${queryError.message}`,
          errorCode: queryError.code || 'unknown',
          hint: 'Check SERVICE_ROLE_KEY is set correctly in Edge Function environment variables'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      isAdmin = !!roleData;
      console.log('[AUTH] Admin check via direct query:', isAdmin);
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Admin access required',
        details: `User ${user.email} does not have admin role`,
        hint: 'Contact an administrator to grant admin access'
      }), {
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
    const { data: gameData } = await supabaseAuth
      .from('games')
      .select('name, description')
      .eq('id', gameId)
      .single();

    const gameName = gameData?.name || 'Game';

    // Fetch category context if applicable
    let categoryName = '';
    let categoryDescription = '';
    if (categoryId) {
      const { data: categoryData } = await supabaseAuth
        .from('categories')
        .select('name, description')
        .eq('id', categoryId)
        .single();
      
      categoryName = categoryData?.name || '';
      categoryDescription = categoryData?.description || '';
    }

    // Build query based on scope
    let query = supabaseAuth
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
          const { data: existingFAQs } = await supabaseAuth
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

Generate questions that help customers make informed purchase decisions for this specific ${productCategoryName} service in ${gameName}.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, just JSON):
{
  "faqs": [
    {
      "question": "Question text here",
      "answer": "Answer text here (2-4 sentences)"
    }
  ]
}

Return exactly ${questionsCount} FAQ items.`;

        const userPrompt = `Generate ${questionsCount} FAQ questions and answers for this product based on the context provided above.`;

        // Use OpenAI API
        console.log('[AI] Calling OpenAI API...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          console.error('[AI ERROR] OpenAI API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorDetails
          });

          if (response.status === 429) {
            throw new Error(`Rate limit exceeded: ${errorDetails.error?.message || errorDetails.message || 'Too many requests'}`);
          }
          if (response.status === 401) {
            throw new Error(`OpenAI API authentication failed: ${errorDetails.error?.message || 'Invalid API key'}`);
          }
          if (response.status === 402 || response.status === 403) {
            throw new Error(`OpenAI billing/quota issue: ${errorDetails.error?.message || 'Payment required or quota exceeded'}`);
          }
          throw new Error(`AI API error: ${response.status} - ${errorDetails.error?.message || errorDetails.message || 'Unknown error'}`);
        }

        const aiData = await response.json();
        const generatedText = aiData.choices?.[0]?.message?.content || '';

        if (!generatedText) {
          throw new Error('OpenAI API returned empty content');
        }

        // Parse the JSON from AI response
        let faqs: any[] = [];
        try {
          // Clean up the response - remove markdown code blocks if present
          let cleanedText = generatedText.trim();
          
          // Remove various markdown code block formats
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.slice(7);
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.slice(3);
          }
          if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3);
          }
          
          // Remove any leading/trailing whitespace and newlines
          cleanedText = cleanedText.trim();
          
          // Try to find JSON object boundaries if there's extra text
          const jsonStart = cleanedText.indexOf('{');
          const jsonEnd = cleanedText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
          }
          
          console.log('[AI] Attempting to parse cleaned JSON (first 500 chars):', cleanedText.substring(0, 500));
          
          const parsed = JSON.parse(cleanedText);
          faqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];
          
          console.log('[AI] Successfully parsed AI response, got', faqs.length, 'FAQs');
        } catch (parseError) {
          console.error('[AI ERROR] Failed to parse AI response:', { 
            error: parseError, 
            rawText: generatedText.substring(0, 500) + '...' 
          });
          throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        if (!faqs.length) {
          throw new Error('AI did not return any FAQs');
        }

        if (!dryRun && faqs.length > 0) {
          // Delete existing FAQs if regenerating
          if (regenerate) {
            await supabaseAuth
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

          const { error: insertError } = await supabaseAuth
            .from('product_faqs')
            .insert(faqsToInsert);

          if (insertError) {
            throw insertError;
          }

          // Log the generation
          await supabaseAuth
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
          await supabaseAuth
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
