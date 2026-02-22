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

    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY') ?? Deno.env.get('EXCHANGE_API_KEY');
    const apiUrl = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      : 'https://open.er-api.com/v6/latest/USD';

    if (!apiKey) {
      console.warn('EXCHANGE_RATE_API_KEY is not configured, using fallback provider');
    }

    console.log('Fetching exchange rates from API...', { hasApiKey: !!apiKey });
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Exchange rate API error:', response.status, errorText);
      throw new Error(`Exchange rate API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log('API response received:', { result: data.result, hasRates: !!data.conversion_rates });
    
    if (data.result && data.result !== 'success') {
      const errorType = data['error-type'] || 'Unknown';
      console.error('API returned non-success result:', errorType);
      throw new Error(`Exchange rate API error: ${errorType}`);
    }
    
    const rates = data.conversion_rates || data.rates;
    const eurRate = rates?.EUR;
    if (!eurRate || typeof eurRate !== 'number') {
      console.error('EUR rate not found or invalid:', eurRate);
      throw new Error('EUR rate not found in API response');
    }
    
    console.log('Fetched EUR rate:', eurRate);

    const upsertRate = async (targetCurrency: 'EUR' | 'USD', rate: number) => {
      const rpcPayload = {
        p_base_currency: 'USD',
        p_target_currency: targetCurrency,
        p_rate: rate,
      };

      const { error: rpcError } = await supabase.rpc('update_exchange_rate', rpcPayload);
      if (!rpcError) return;

      console.warn(`RPC update_exchange_rate failed for ${targetCurrency}, falling back to direct update/insert`, rpcError);

      const nowIso = new Date().toISOString();
      const { data: updatedRows, error: updateError } = await supabase
        .from('exchange_rates')
        .update({
          rate,
          last_updated: nowIso,
        })
        .eq('base_currency', 'USD')
        .eq('target_currency', targetCurrency)
        .select('id');

      if (updateError) {
        throw new Error(
          `Failed to update ${targetCurrency} rate (rpc: ${rpcError.message}; update: ${updateError.message})`
        );
      }

      if ((updatedRows?.length ?? 0) === 0) {
        const { error: insertError } = await supabase
          .from('exchange_rates')
          .insert({
            base_currency: 'USD',
            target_currency: targetCurrency,
            rate,
            last_updated: nowIso,
          });

        if (insertError) {
          throw new Error(
            `Failed to update ${targetCurrency} rate (rpc: ${rpcError.message}; insert: ${insertError.message})`
          );
        }
      }
    };

    // Update USD to EUR rate
    console.log('Updating USD to EUR rate...');
    await upsertRate('EUR', eurRate);
    console.log('USD to EUR rate updated successfully');

    // Update USD to USD rate
    console.log('Updating USD to USD rate...');
    await upsertRate('USD', 1.0);
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
