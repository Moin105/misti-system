import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateGameFAQsRequest {
  gameId: string;
  dryRun?: boolean;
  regenerate?: boolean;
  questionsCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    if (!supabaseServiceKey) {
      throw new Error('Missing service role key (SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY)');
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: 'Missing bearer token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create service role client for auth verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user is authenticated using token directly
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GenerateGameFAQsRequest = await req.json();
    const {
      gameId,
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

    // Fetch game data with genres
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select(`
        id,
        name,
        slug,
        description,
        meta_description,
        meta_keywords,
        game_platform
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch game genres
    const { data: genreAssignments } = await supabase
      .from('game_genre_assignments')
      .select('game_genres(name)')
      .eq('game_id', gameId);

    const genres = genreAssignments?.map((g: any) => g.game_genres?.name).filter(Boolean) || [];

    // Fetch categories for this game to understand available services
    const { data: categories } = await supabase
      .from('categories')
      .select('name, description')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('sort_order');

    const categoryNames = categories?.map(c => c.name) || [];

    // Check if FAQs already exist
    if (!regenerate) {
      const { data: existingFAQs } = await supabase
        .from('game_faqs')
        .select('id')
        .eq('game_id', gameId)
        .limit(1);

      if (existingFAQs && existingFAQs.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          status: 'skipped',
          message: 'FAQs already exist. Enable regenerate to replace them.',
          questionsGenerated: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build system prompt for game-level FAQs
    let systemPrompt = `You are an SEO expert creating FAQ sections for a gaming services website.
Your task is to generate ${questionsCount} frequently asked questions specifically about services for this game.

Rules:
- Focus on game-level questions customers commonly ask about services for this specific game
- Cover topics like: available service types, safety and security, account protection, delivery times, platform compatibility, guarantees, payment methods
- Use natural language that matches search intent
- Answers should be 2-4 sentences, informative but concise
- Include relevant keywords naturally without keyword stuffing
- Address common concerns and build trust
- Make questions specific to this game and the services offered

Game Information:
Name: ${gameData.name}
${gameData.game_platform ? `Platform: ${gameData.game_platform}` : ''}
${gameData.description ? `Description: ${gameData.description}` : ''}
${gameData.meta_description ? `About: ${gameData.meta_description}` : ''}
${genres.length > 0 ? `Genres: ${genres.join(', ')}` : ''}
${categoryNames.length > 0 ? `Available Services: ${categoryNames.join(', ')}` : ''}

Generate questions that help potential customers understand what services are available for ${gameData.name} and address their concerns about safety, delivery, and value.`;

    console.log('Generating FAQs for game:', gameData.name);

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
          { role: "user", content: "Generate the FAQ questions and answers for this game." }
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
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ 
        error: 'Payment required. Please add credits to your Lovable AI workspace.' 
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function || typeof toolCall.function.arguments !== 'string') {
      console.error('Unexpected AI response:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected AI response format');
    }

    let faqs: any[] = [];
    try {
      const faqsData = JSON.parse(toolCall.function.arguments);
      faqs = Array.isArray(faqsData.faqs) ? faqsData.faqs : [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!faqs.length) {
      throw new Error('AI did not return any FAQs');
    }

    console.log(`Generated ${faqs.length} FAQs for game ${gameData.name}`);

    if (!dryRun) {
      // Delete existing FAQs if regenerating
      if (regenerate) {
        await supabase
          .from('game_faqs')
          .delete()
          .eq('game_id', gameId);
      }

      // Insert new FAQs
      const faqsToInsert = faqs.map((faq: any, index: number) => ({
        game_id: gameId,
        question: faq.question,
        answer: faq.answer,
        sort_order: index,
        generated_by: 'ai',
        is_active: true
      }));

      const { error: insertError } = await supabase
        .from('game_faqs')
        .insert(faqsToInsert);

      if (insertError) {
        console.error('Error inserting FAQs:', insertError);
        throw insertError;
      }

      // Log the generation
      await supabase
        .from('faq_generation_logs')
        .insert({
          game_id: gameId,
          operation_type: `game_${regenerate ? 'regenerate' : 'generate'}`,
          status: 'success',
          questions_generated: faqs.length,
          processing_time_ms: Date.now() - startTime,
          created_by: user.id
        });
    }

    const processingTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      status: dryRun ? 'preview' : 'success',
      questionsGenerated: faqs.length,
      processingTimeMs: processingTime,
      gameName: gameData.name,
      faqs: dryRun ? faqs : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-game-faqs:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
