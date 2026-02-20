import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  sourceUrl: string;
  gameId: string;
  categoryId: string;
  productType: 'simple' | 'single_slider' | 'multi_range';
  regionPlatform?: string;
  unit?: string;
  deliveryMethod?: string;
  notes?: string;
  gameName?: string;
  categoryName?: string;
}

serve(async (req) => {
  console.log('[FUNCTION START] Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('[OPTIONS] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[AUTH] Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[AUTH ERROR] No Authorization header');
      return new Response(JSON.stringify({ 
        error: 'Authorization required',
        details: 'Missing Authorization header',
        hint: 'Include Authorization: Bearer <token> header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
      'https://sclvjrnnnbbptnhonoks.supabase.co';
    
    console.log('[CONFIG] Environment check:', {
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasFirecrawlKey: !!Deno.env.get('FIRECRAWL_API_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    });
    
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Detailed error checking with specific messages
    if (!supabaseServiceKey) {
      console.error('[ERROR] SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing',
        hint: 'Set SUPABASE_SERVICE_ROLE_KEY in Edge Function environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!firecrawlApiKey) {
      console.error('[ERROR] FIRECRAWL_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'Firecrawl connector not configured',
        details: 'FIRECRAWL_API_KEY environment variable is missing',
        hint: 'Set FIRECRAWL_API_KEY in Edge Function environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openaiApiKey) {
      console.error('[ERROR] OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
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
      console.error('[ERROR] Invalid token format - token too short or missing');
      return new Response(JSON.stringify({ 
        error: 'Invalid authorization token',
        details: 'Token is missing or too short',
        hint: 'Make sure Authorization header contains a valid Bearer token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create service role client for auth verification (same pattern as verify-payment)
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

    // Check admin role (using same service role client)
    console.log('[AUTH] Checking admin role for user:', user.id);
    const { data: roleData, error: roleError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('[AUTH ERROR] Failed to check admin role:', {
        message: roleError.message,
        code: roleError.code,
        details: roleError.details,
        hint: roleError.hint
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to verify admin role',
        details: roleError.message || 'Database query failed',
        errorCode: roleError.code || 'unknown',
        hint: roleError.hint || 'Check database permissions and RLS policies'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!roleData) {
      console.warn('[AUTH] User does not have admin role:', user.id);
      return new Response(JSON.stringify({ 
        error: 'Admin access required',
        details: `User ${user.email} does not have admin role`,
        hint: 'Contact an administrator to grant admin access'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[AUTH] Admin role verified');

    const body: GenerateRequest = await req.json();
    const { sourceUrl, gameId, categoryId, productType, regionPlatform, unit, deliveryMethod, notes, gameName, categoryName } = body;

    if (!sourceUrl || !gameId || !categoryId || !productType) {
      return new Response(JSON.stringify({ error: 'Missing required fields: sourceUrl, gameId, categoryId, productType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Step 1: Fetching content from URL:', sourceUrl);

    // Format URL
    let formattedUrl = sourceUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Scrape the source URL using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }
      
      console.error('[FIRECRAWL ERROR] Scraping failed:', {
        status: scrapeResponse.status,
        statusText: scrapeResponse.statusText,
        error: errorDetails
      });
      
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch source page',
        details: errorDetails.error?.message || errorDetails.message || 'Scraping failed',
        status: scrapeResponse.status,
        hint: 'The website may be blocking scrapers, or the URL is invalid. Try a different URL.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scrapeData = await scrapeResponse.json();
    const sourceContent = scrapeData.data?.markdown || scrapeData.markdown || '';

    if (!sourceContent || sourceContent.length < 100) {
      return new Response(JSON.stringify({ error: 'Could not extract meaningful content from the source page' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[AI] Step 2: Generating original content with OpenAI');

    // Build the AI prompt based on product type
    let productTypeInstructions = '';
    let sliderConfigInstructions = '';
    
    if (productType === 'single_slider') {
      productTypeInstructions = `This is a SINGLE SLIDER product where the user selects one value (e.g., "I want to reach level 60").`;
      sliderConfigInstructions = `
  "slider_config": {
    "slider_type": "single",
    "value_label": "What the value represents (e.g., Target Level)",
    "min_value": number,
    "max_value": number,
    "default_value": number,
    "step": number (usually 1),
    "price_per_step": suggested price per unit,
    "estimated_time_per_step": hours per unit
  },`;
    } else if (productType === 'multi_range') {
      productTypeInstructions = `This is a MULTI-RANGE SLIDER product where user selects a range (e.g., "from level 1 to level 60").`;
      sliderConfigInstructions = `
  "slider_config": {
    "min_value": minimum value,
    "max_value": maximum value,
    "step": 1,
    "default_start": suggested start value,
    "default_end": suggested end value,
    "start_label": "Label for start (e.g., Current Level)",
    "end_label": "Label for end (e.g., Desired Level)",
    "price_per_step": suggested price per level,
    "estimated_time_per_step": hours per level
  },`;
    }

    const systemPrompt = `You are a professional product copywriter for misti.services, a premium gaming services marketplace.

CRITICAL RULES:
1. NEVER copy text directly from the source. Extract facts/structure and write COMPLETELY ORIGINAL content.
2. Use professional but friendly tone - like talking to a fellow gamer.
3. All content must be unique to misti.services brand voice.
4. Focus on value proposition and customer benefits.
5. Be specific about what's included, requirements, and how the service works.
6. ABSOLUTELY NO EMOJIS - maintain professional tone throughout all fields.

DESCRIPTION FORMAT (CRITICAL - must follow exactly):
1. Start with H1 containing the product name in bold: <h1><strong>Product Name</strong></h1>
2. Immediately after H1, include a 2-3 sentence SEO summary paragraph (no heading, just <p> tag) with main keywords naturally included
3. Use <h2> for main sections and <h3> for sub-sections
4. List items should have bold labels: <li><strong>Label:</strong> Description</li>
5. End with a closing paragraph mentioning misti.services brand

SEO REQUIREMENTS (CRITICAL - must match existing misti.services products):
- meta_title: MUST be under 60 characters, include main keyword, end with "| misti.services" (lowercase, full domain)
- meta_description: MUST be 150-160 characters exactly, naturally include target keyword
- meta_keywords: Follow existing product pattern - include: product name variations, game abbreviation (WoW, EFT, D4), service type, specific features, "buy" and "price" keywords. Example pattern: "wow power leveling buy, power leveling service, wow leveling boost, wow level boost price, fast wow leveling..."

Game: ${gameName || 'Gaming Service'}
Category: ${categoryName || 'Service'}
${regionPlatform ? `Region/Platform: ${regionPlatform}` : ''}
${unit ? `Unit type: ${unit}` : ''}
${deliveryMethod ? `Delivery method: ${deliveryMethod}` : ''}
${notes ? `Additional context: ${notes}` : ''}

${productTypeInstructions}`;

    const userPrompt = `Based on this source content (DO NOT COPY - extract facts only and rewrite completely):

${sourceContent.substring(0, 8000)}

Generate a complete product listing in the following JSON format:
{
  "name": "Product name (clear, descriptive, include game name if relevant)",
  "slug": "url-friendly-slug-lowercase-with-hyphens",
  "short_description": "1-2 sentence hook that sells the product - NO EMOJIS (max 200 chars)",
  "description": "Full HTML description with this EXACT structure:
    1. <h1><strong>Product Name</strong></h1>
    2. <p>SEO summary paragraph (2-3 sentences with main keywords naturally included)</p>
    3. <h2>Service Includes</h2> with <ul> bullet list of what's included using <li><strong>Label:</strong> Description</li> format
    4. <h2>About [Game/Service Name]</h2> with context paragraph
    5. <h3>Why Choose Our Service</h3> with <ul> bullet list with bold labels explaining benefits
    6. <p>Closing paragraph mentioning misti.services brand and encouraging purchase</p>
    NO EMOJIS ALLOWED.",
  "how_it_works": "Step-by-step process in HTML format with <ol> or <ul> - NO EMOJIS",
  "requirements": "What the customer needs to provide (HTML list) - NO EMOJIS",
  "meta_title": "SEO title UNDER 60 chars ending with | misti.services",
  "meta_description": "SEO description EXACTLY 150-160 chars with main keyword",
  "meta_keywords": "25+ keywords following pattern: product name buy, product name price, game abbreviation service type, specific features, variations",
  "image_alt_text": "Descriptive alt text for product image",
  "base_price": suggested base price as number${sliderConfigInstructions}
}

IMPORTANT: NO EMOJIS anywhere. Return ONLY the JSON object, no markdown formatting.`;

    // Use OpenAI API
    console.log('[AI] Calling OpenAI API...');
    let aiResponse;
    try {
      aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          max_tokens: 4000,
        }),
      });
    } catch (fetchError) {
      console.error('[AI ERROR] Network error calling OpenAI:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Network error calling OpenAI API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown network error',
        hint: 'Check internet connection and OpenAI API status'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }
      
      console.error('[AI ERROR] OpenAI API error:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorDetails
      });
      
      if (aiResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'OpenAI API authentication failed',
          details: errorDetails.error?.message || 'Invalid API key',
          hint: 'Check OPENAI_API_KEY in Edge Function environment variables'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'OpenAI rate limit exceeded',
          details: errorDetails.error?.message || 'Too many requests',
          hint: 'Wait a moment and try again, or check your OpenAI usage limits'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402 || aiResponse.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'OpenAI billing/quota issue',
          details: errorDetails.error?.message || 'Payment required or quota exceeded',
          hint: 'Check your OpenAI account billing and usage limits'
        }), {
          status: aiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed',
        details: errorDetails.error?.message || errorText || 'Unknown error',
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        hint: 'Check OpenAI API status and your account settings'
      }), {
        status: aiResponse.status >= 400 && aiResponse.status < 500 ? aiResponse.status : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (parseError) {
      console.error('[AI ERROR] Failed to parse OpenAI response:', parseError);
      const responseText = await aiResponse.text();
      return new Response(JSON.stringify({ 
        error: 'Invalid response from OpenAI API',
        details: 'Response is not valid JSON',
        responsePreview: responseText.substring(0, 200),
        hint: 'OpenAI API may have returned an unexpected format'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const generatedText = aiData.choices?.[0]?.message?.content || '';
    
    if (!generatedText) {
      console.error('[AI ERROR] No content in OpenAI response:', aiData);
      return new Response(JSON.stringify({ 
        error: 'OpenAI returned empty content',
        details: 'No text generated in response',
        response: aiData,
        hint: 'Check OpenAI API response format or try again'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[AI] Step 3: Parsing AI response (length:', generatedText.length, 'chars)');

    // Parse the JSON from AI response
    let generatedProduct;
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
      
      console.log('Attempting to parse cleaned JSON (first 500 chars):', cleanedText.substring(0, 500));
      
      generatedProduct = JSON.parse(cleanedText);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('[PARSE ERROR] Failed to parse AI response:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined,
        generatedTextLength: generatedText.length,
        generatedTextPreview: generatedText.substring(0, 500)
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI-generated content',
        details: parseError instanceof Error ? parseError.message : 'JSON parsing failed',
        generatedTextPreview: generatedText.substring(0, 500),
        hint: 'AI may have returned invalid JSON. Try generating again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and fix SEO fields
    console.log('Step 4: Validating SEO fields');
    
    // Ensure meta_title is under 60 chars
    if (generatedProduct.meta_title && generatedProduct.meta_title.length > 60) {
      const base = generatedProduct.meta_title.replace(/\s*\|\s*Misti\s*$/i, '');
      generatedProduct.meta_title = base.substring(0, 51) + ' | Misti';
    }
    
    // Ensure meta_description is 150-160 chars
    if (generatedProduct.meta_description) {
      if (generatedProduct.meta_description.length < 150) {
        generatedProduct.meta_description = generatedProduct.meta_description.padEnd(150, ' Buy now!');
      } else if (generatedProduct.meta_description.length > 160) {
        generatedProduct.meta_description = generatedProduct.meta_description.substring(0, 157) + '...';
      }
    }
    
    // Ensure at least 20 keywords
    if (generatedProduct.meta_keywords) {
      const keywords = generatedProduct.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
      if (keywords.length < 20) {
        const extraKeywords = ['gaming service', 'fast delivery', 'professional', 'reliable', 'secure', 'boosting', 'carry', 'account', 'safe', 'trusted'];
        const needed = Math.min(20 - keywords.length, extraKeywords.length);
        for (let i = 0; i < needed; i++) {
          if (!keywords.includes(extraKeywords[i])) {
            keywords.push(extraKeywords[i]);
          }
        }
        generatedProduct.meta_keywords = keywords.join(', ');
      }
    }

    console.log('Step 5: Returning generated fields directly');

    // Return the generated fields directly - NO DATABASE SAVE
    return new Response(JSON.stringify({ 
      success: true, 
      fields: {
        name: generatedProduct.name || '',
        slug: generatedProduct.slug || '',
        short_description: generatedProduct.short_description || '',
        description: generatedProduct.description || '',
        how_it_works: generatedProduct.how_it_works || '',
        requirements: generatedProduct.requirements || '',
        meta_title: generatedProduct.meta_title || '',
        meta_description: generatedProduct.meta_description || '',
        meta_keywords: generatedProduct.meta_keywords || '',
        image_alt_text: generatedProduct.image_alt_text || '',
        base_price: generatedProduct.base_price || 0,
        slider_config: generatedProduct.slider_config || null,
        faqs: generatedProduct.faqs || [],
      },
      sourceUrl: formattedUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[FATAL ERROR] Unexpected error in generate-product-fields:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError'
    });
    return new Response(JSON.stringify({ 
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: error instanceof Error ? error.name : typeof error,
      hint: 'Check function logs for more details'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
