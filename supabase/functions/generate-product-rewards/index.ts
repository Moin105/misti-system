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
    
    // Log all environment variables (without exposing secrets)
    const allEnvVars = Object.keys(Deno.env.toObject());
    const relevantEnvVars = allEnvVars.filter(key => 
      key.includes('SUPABASE') || key.includes('SERVICE') || key.includes('FIRE') || key.includes('OPENAI')
    );
    
    console.log('[CONFIG] Environment check:', {
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      serviceKeyPreview: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'MISSING',
      allRelevantEnvVars: relevantEnvVars,
      serviceKeySource: Deno.env.get('SERVICE_ROLE_KEY') ? 'SERVICE_ROLE_KEY' : (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NONE')
    });
    
    if (!supabaseServiceKey) {
      console.error('[ERROR] Service role key not configured');
      console.error('[ERROR] Checked both SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY');
      console.error('[ERROR] Available env vars:', allEnvVars);
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Service role key environment variable is missing. Checked both SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY.',
        hint: 'Set SERVICE_ROLE_KEY in Supabase Dashboard → Edge Functions → Settings → Secrets. Get the RAW key from Dashboard → Settings → API → service_role key (copy it EXACTLY as-is, do NOT encrypt/hash it).'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify service key format (should be a JWT)
    // Try to decode and verify it's a service_role key
    let keyIsValid = false;
    let keyRole = 'unknown';
    let keyError = '';
    try {
      const parts = supabaseServiceKey.split('.');
      if (parts.length === 3) {
        // Decode JWT payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        keyRole = payload.role || 'unknown';
        keyIsValid = payload.role === 'service_role';
        
        console.log('[CONFIG] Service key decoded:', {
          role: keyRole,
          ref: payload.ref,
          isValid: keyIsValid
        });
      } else {
        keyError = 'Key does not have 3 JWT parts (header.payload.signature)';
      }
    } catch (decodeError) {
      keyError = decodeError instanceof Error ? decodeError.message : String(decodeError);
      console.error('[ERROR] Could not decode service key:', decodeError);
    }
    
    if (!keyIsValid) {
      console.error('[ERROR] Service role key format invalid or wrong role');
      console.error('[ERROR] Key preview:', supabaseServiceKey.substring(0, 50) + '...');
      console.error('[ERROR] Key length:', supabaseServiceKey.length);
      console.error('[ERROR] Key role detected:', keyRole);
      console.error('[ERROR] Decode error:', keyError);
      
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: `Service role key is not a valid service_role JWT token. Key length: ${supabaseServiceKey.length}, Detected role: ${keyRole}, Error: ${keyError || 'none'}`,
        hint: 'CRITICAL FIX: The secret value MUST be the RAW service_role key from Dashboard → Settings → API → service_role key. It should start with "eyJ..." and be very long. Do NOT encrypt, hash, or modify it. Paste it EXACTLY as shown in the Dashboard. If you cannot delete the old secret, create a NEW one named "SERVICE_ROLE_KEY" with the correct value.'
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
    
    // Create service role client for auth verification (same pattern as generate-product-fields)
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
    console.log('[AUTH] Service role key verification:', {
      hasKey: !!supabaseServiceKey,
      keyLength: supabaseServiceKey?.length || 0,
      keyPreview: supabaseServiceKey ? supabaseServiceKey.substring(0, 30) + '...' : 'MISSING',
      supabaseUrl: supabaseUrl
    });
    
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

    const body: GenerateRewardsRequest = await req.json();
    const { scope, gameId, categoryId, productId, dryRun = false, regenerate = false } = body;

    // Get game and category context
    let gameContext = '';
    let categoryContext = '';

    if (gameId) {
      const { data: game } = await supabaseAuth
        .from('games')
        .select('name, description')
        .eq('id', gameId)
        .single();
      if (game) {
        gameContext = `Game: ${game.name}. ${game.description || ''}`;
      }
    }

    if (categoryId) {
      const { data: category } = await supabaseAuth
        .from('categories')
        .select('name, description')
        .eq('id', categoryId)
        .single();
      if (category) {
        categoryContext = `Category: ${category.name}. ${category.description || ''}`;
      }
    }

    // Build product query based on scope
    let productsQuery = supabaseAuth
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
          const { data: existing } = await supabaseAuth
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

        // Use OpenAI API (removed Lovable AI support)
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        
        if (!openaiApiKey) {
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'error',
            error: 'OPENAI_API_KEY is not configured',
          });
          continue;
        }

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
              { role: 'user', content: `Generate rewards content for: ${product.name}` }
            ],
            temperature: 0.7,
            max_tokens: 1000,
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
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: `Rate limit exceeded: ${errorDetails.error?.message || errorDetails.message || 'Too many requests'}`,
            });
            continue;
          }
          if (response.status === 401) {
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: `OpenAI API authentication failed: ${errorDetails.error?.message || errorDetails.message || 'Invalid API key'}`,
            });
            continue;
          }
          if (response.status === 402 || response.status === 403) {
            results.push({
              productId: product.id,
              productName: product.name,
              status: 'error',
              error: `OpenAI billing/quota issue: ${errorDetails.error?.message || errorDetails.message || 'Payment required or quota exceeded'}`,
            });
            continue;
          }
          throw new Error(`AI API error: ${response.status} - ${errorDetails.error?.message || errorDetails.message || errorText}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('No content in AI response');
        }

        // Parse JSON from response
        let parsed;
        try {
          // Clean up the response - remove markdown code blocks if present
          let cleanedContent = content.trim();
          
          // Remove markdown code blocks
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.slice(7);
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.slice(3);
          }
          if (cleanedContent.endsWith('```')) {
            cleanedContent = cleanedContent.slice(0, -3);
          }
          cleanedContent = cleanedContent.trim();
          
          // Try to find JSON object boundaries
          const jsonStart = cleanedContent.indexOf('{');
          const jsonEnd = cleanedContent.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
          }
          
          parsed = JSON.parse(cleanedContent);
          
          // Validate required field
          if (!parsed.rewards_content) {
            throw new Error('Missing rewards_content field in AI response');
          }
        } catch (parseError) {
          console.error('[PARSE ERROR] Failed to parse AI response:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            contentPreview: content.substring(0, 500)
          });
          throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
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
            await supabaseAuth
              .from('product_rewards')
              .delete()
              .eq('product_id', product.id);
          }

          // Insert new rewards (id will be auto-generated by database default)
          const { error: insertError } = await supabaseAuth
            .from('product_rewards')
            .insert({
              product_id: product.id,
              rewards_content: parsed.rewards_content,
              is_approved: false,
              generated_at: new Date().toISOString(),
              // Note: id is not included - database will generate it via DEFAULT gen_random_uuid()
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
        console.error(`[PROCESS ERROR] Error processing ${product.name}:`, {
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
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
