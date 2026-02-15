import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting exchange rate update...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!apiKey) {
      throw new Error('EXCHANGE_RATE_API_KEY is not configured');
    }

    console.log('Fetching exchange rates...');
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result !== 'success') {
      throw new Error(`API error: ${data['error-type'] || 'Unknown'}`);
    }
    
    const eurRate = data.conversion_rates?.EUR;
    if (!eurRate) {
      throw new Error('EUR rate not found in API response');
    }
    
    console.log('Fetched EUR rate:', eurRate);

    // Update USD to EUR rate
    const { error: eurError } = await supabase.rpc('update_exchange_rate', {
      p_base_currency: 'USD',
      p_target_currency: 'EUR',
      p_rate: eurRate
    });

    if (eurError) {
      console.error('Error updating EUR rate:', eurError);
      throw eurError;
    }

    // Update USD to USD rate
    const { error: usdError } = await supabase.rpc('update_exchange_rate', {
      p_base_currency: 'USD',
      p_target_currency: 'USD',
      p_rate: 1.0
    });

    if (usdError) {
      console.error('Error updating USD rate:', usdError);
      throw usdError;
    }

    console.log('Successfully updated exchange rates');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Exchange rates updated',
        usd_to_eur: eurRate
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
