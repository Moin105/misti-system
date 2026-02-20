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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
      'https://sclvjrnnnbbptnhonoks.supabase.co';
    
    // Try to get anon key from env, fallback to hardcoded (for Edge Functions)
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHZqcm5ubmJicHRuaG9ub2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk3MjEsImV4cCI6MjA4Njg0NTcyMX0.YK_RfC9JiclVdReaRK05-F1xMvjZtvJKzjrml-AkWbM';
    
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    
    // Support both OpenAI and Lovable AI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiProvider = openaiApiKey ? 'openai' : (lovableApiKey ? 'lovable' : null);

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Firecrawl connector not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!aiProvider) {
      console.error('Neither OPENAI_API_KEY nor LOVABLE_API_KEY configured');
      return new Response(JSON.stringify({ error: 'AI provider not configured. Please set OPENAI_API_KEY or LOVABLE_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Create service role client for auth verification (same pattern as verify-payment)
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user is authenticated using token directly
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      console.error('Token preview:', token.substring(0, 20) + '...');
      return new Response(JSON.stringify({ 
        error: 'Invalid JWT', 
        details: userError?.message || 'User authentication failed',
        hint: 'Token verification failed. Make sure you are logged in and token is valid.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role (using same service role client)
    const { data: roleData } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      console.error('Firecrawl error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch source page. The website may be blocking scrapers.' }), {
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

    console.log(`Step 2: Generating original content with AI (Provider: ${aiProvider})`);

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

    // Use OpenAI or Lovable AI based on available keys
    let aiResponse;
    if (aiProvider === 'openai') {
      console.log('Using OpenAI API');
      aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // or 'gpt-4-turbo' or 'gpt-3.5-turbo'
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
    } else {
      console.log('Using Lovable AI API');
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content || '';

    console.log('Step 3: Parsing AI response');

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
      console.error('Failed to parse AI response:', parseError, generatedText);
      return new Response(JSON.stringify({ error: 'Failed to parse AI-generated content. Please try again.' }), {
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
    console.error('Error in generate-product-fields:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
