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
      console.error('Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY');
    if (!apiKey) {
      console.error('EXCHANGE_RATE_API_KEY is not configured');
      throw new Error('EXCHANGE_RATE_API_KEY is not configured');
    }

    console.log('Fetching exchange rates from API...');
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Exchange rate API error:', response.status, errorText);
      throw new Error(`Exchange rate API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('API response received:', { result: data.result, hasRates: !!data.conversion_rates });
    
    if (data.result !== 'success') {
      const errorType = data['error-type'] || 'Unknown';
      console.error('API returned non-success result:', errorType);
      throw new Error(`Exchange rate API error: ${errorType}`);
    }
    
    const eurRate = data.conversion_rates?.EUR;
    if (!eurRate || typeof eurRate !== 'number') {
      console.error('EUR rate not found or invalid:', eurRate);
      throw new Error('EUR rate not found in API response');
    }
    
    console.log('Fetched EUR rate:', eurRate);

    // Update USD to EUR rate
    console.log('Updating USD to EUR rate...');
    const { data: eurData, error: eurError } = await supabase.rpc('update_exchange_rate', {
      p_base_currency: 'USD',
      p_target_currency: 'EUR',
      p_rate: eurRate
    });

    if (eurError) {
      console.error('Error updating EUR rate:', JSON.stringify(eurError, null, 2));
      throw new Error(`Failed to update EUR rate: ${eurError.message || JSON.stringify(eurError)}`);
    }
    console.log('USD to EUR rate updated successfully');

    // Update USD to USD rate
    console.log('Updating USD to USD rate...');
    const { data: usdData, error: usdError } = await supabase.rpc('update_exchange_rate', {
      p_base_currency: 'USD',
      p_target_currency: 'USD',
      p_rate: 1.0
    });

    if (usdError) {
      console.error('Error updating USD rate:', JSON.stringify(usdError, null, 2));
      throw new Error(`Failed to update USD rate: ${usdError.message || JSON.stringify(usdError)}`);
    }
    console.log('USD to USD rate updated successfully');

    console.log('Successfully updated all exchange rates');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Exchange rates updated successfully',
        usd_to_eur: eurRate,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Exchange rate update error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', errorDetails);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: errorDetails ? errorDetails.substring(0, 500) : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
