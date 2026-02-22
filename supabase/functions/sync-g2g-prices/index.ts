import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to round prices to 6 decimal places for clean storage
const roundPrice = (price: number): number => {
  return Math.round(price * 1000000) / 1000000;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncConfig {
  id: string;
  product_id: string;
  g2g_url: string;
  api_url: string | null;
  scrape_method: 'api' | 'scrape';
  price_unit: number;
  price_unit_label: string;
  markup_percentage: number;
  sync_type: 'product' | 'option';
  product_option_id: string | null;
  option_label: string | null;
  target_seller: string | null;
  products: {
    id: string;
    name: string;
    slider_config: any;
    is_slider_product: boolean;
  };
}

interface SyncResult {
  configId: string;
  productId: string;
  productName: string;
  target: string;
  success: boolean;
  g2gPrice?: number;
  ourPrice?: number;
  error?: string;
}

type OptionEntry = { label: string; price?: number; priceType?: string; [key: string]: any };

function normalizeOptionEntries(rawOptions: unknown): OptionEntry[] {
  if (!rawOptions) return [];

  let parsed = rawOptions;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.filter((opt): opt is OptionEntry => !!opt && typeof opt === 'object');
  }

  if (parsed && typeof parsed === 'object') {
    return [parsed as OptionEntry];
  }

  return [];
}

// Select price based on average of top 5 lowest offers for market accuracy
function selectReliablePrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  
  // Sort ascending (lowest first)
  const sorted = [...prices].sort((a, b) => a - b);
  
  // Take top 5 (or all if less than 5)
  const topN = Math.min(5, sorted.length);
  const topPrices = sorted.slice(0, topN);
  
  // Calculate average of top prices
  const average = topPrices.reduce((sum, p) => sum + p, 0) / topPrices.length;
  
  console.log(`Price selection: ${sorted.length} offers available`);
  console.log(`  Lowest: ${sorted[0].toFixed(6)}, Top ${topN} avg: ${average.toFixed(6)}, Highest: ${sorted[sorted.length - 1].toFixed(6)}`);
  console.log(`  Top ${topN} prices: ${topPrices.map(p => p.toFixed(6)).join(', ')}`);
  
  return average;
}

// Filter offers by seller username and extract their lowest price
function extractPriceFromSeller(offers: any[], targetSeller: string): number | null {
  // Log sample offer to debug field structure
  if (offers.length > 0) {
    const sample = offers[0];
    console.log(`Sample offer fields: username="${sample.username}", seller_id="${sample.seller_id}", store_name="${sample.store_name}"`);
  }
  
  const sellerOffers = offers.filter(offer => {
    // G2G API has "username" at root level (PRIMARY field)
    // Also check other possible fields for compatibility
    const sellerName = 
      offer.username ||                    // PRIMARY: G2G API uses this at root level
      offer.seller_store_name || 
      offer.store_name ||
      offer.seller?.store_name || 
      offer.seller?.username ||
      offer.seller_username;
    
    if (!sellerName) return false;
    
    const matches = sellerName.toLowerCase() === targetSeller.toLowerCase();
    if (matches) {
      console.log(`Found matching offer from seller "${sellerName}"`);
    }
    return matches;
  });
  
  if (sellerOffers.length === 0) {
    // Log all unique sellers to help debugging
    const uniqueSellers = [...new Set(offers.map(o => o.username).filter(Boolean))];
    console.log(`Target seller "${targetSeller}" not found in ${offers.length} offers`);
    console.log(`Available sellers: ${uniqueSellers.slice(0, 15).join(', ')}${uniqueSellers.length > 15 ? ` (+${uniqueSellers.length - 15} more)` : ''}`);
    return null;
  }
  
  // Get prices from this seller's offers
  const sellerPrices: number[] = [];
  for (const offer of sellerOffers) {
    // Try converted_unit_price first (per-unit price in converted currency)
    let price = parseFloat(offer.converted_unit_price);
    if (isNaN(price) || price <= 0) {
      // Fallback to other price fields
      price = parseFloat(offer.unit_price || offer.unitPrice || offer.price_per_unit || 0);
    }
    if (!isNaN(price) && price > 0) {
      sellerPrices.push(price);
    }
  }
  
  if (sellerPrices.length === 0) {
    console.log(`No valid prices found for seller "${targetSeller}"`);
    return null;
  }
  
  // Use the lowest price from this seller (they may have multiple offers)
  const lowestPrice = Math.min(...sellerPrices);
  console.log(`Found ${sellerOffers.length} offers from "${targetSeller}", using lowest: ${lowestPrice}`);
  return lowestPrice;
}

// Extract price from G2G API JSON response
// G2G API returns `converted_unit_price` which is price per 1 unit (e.g., 0.026477 EUR per 1 gold)
function extractPriceFromApiResponse(data: any, targetSeller?: string | null): { price: number; unit: number } | null {
  console.log('Extracting price from API response', targetSeller ? `(target seller: ${targetSeller})` : '');
  
  try {
    // G2G API structure: { code: 2000, payload: { results: [...] } }
    let offers = null;
    
    if (data?.payload?.results && Array.isArray(data.payload.results)) {
      offers = data.payload.results;
      console.log('Found offers in payload.results');
    } else if (data?.results && Array.isArray(data.results)) {
      offers = data.results;
      console.log('Found offers in results');
    } else if (data?.offers && Array.isArray(data.offers)) {
      offers = data.offers;
    } else if (data?.data?.offers && Array.isArray(data.data.offers)) {
      offers = data.data.offers;
    } else if (data?.data?.results && Array.isArray(data.data.results)) {
      offers = data.data.results;
    } else if (Array.isArray(data)) {
      offers = data;
    }
    
    if (!offers || offers.length === 0) {
      console.log('No offers array found in API response. Response keys:', Object.keys(data || {}));
      // Try to find any nested array that might contain offers
      const findOffers = (obj: any, depth = 0): any[] | null => {
        if (depth > 3 || !obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') return obj;
        for (const key of Object.keys(obj)) {
          const result = findOffers(obj[key], depth + 1);
          if (result) return result;
        }
        return null;
      };
      offers = findOffers(data);
    }
    
    if (!offers || offers.length === 0) {
      console.log('Could not find offers in API response');
      return null;
    }
    
    console.log(`Found ${offers.length} offers in API response`);
    
    // If target_seller is specified, try to use their price first
    if (targetSeller) {
      const sellerPrice = extractPriceFromSeller(offers, targetSeller);
      if (sellerPrice) {
        console.log(`Using price from target seller "${targetSeller}": ${sellerPrice}`);
        return { price: sellerPrice, unit: 1 };
      }
      console.log(`Target seller "${targetSeller}" not found or has no valid prices, falling back to 4th lowest`);
    }
    
    // Extract prices from offers - prioritize converted_unit_price
    const prices: { raw: number; perUnit: number }[] = [];
    
    for (const offer of offers) {
      let pricePerUnit: number | null = null;
      
      // Priority 1: converted_unit_price (G2G's price per 1 unit in converted currency)
      if (offer.converted_unit_price !== undefined && offer.converted_unit_price !== null) {
        pricePerUnit = parseFloat(offer.converted_unit_price);
        if (!isNaN(pricePerUnit) && pricePerUnit > 0) {
          console.log(`Offer ${offer.offer_id || 'unknown'}: converted_unit_price = ${pricePerUnit} per unit`);
          prices.push({ raw: pricePerUnit, perUnit: pricePerUnit });
          continue;
        }
      }
      
      // Priority 2: unit_price fields
      const unitPriceFields = ['unit_price', 'unitPrice', 'unit_price_usd', 'pricePerUnit', 'price_per_unit'];
      for (const field of unitPriceFields) {
        if (offer[field] !== undefined && offer[field] !== null) {
          pricePerUnit = parseFloat(offer[field]);
          if (!isNaN(pricePerUnit) && pricePerUnit > 0) {
            console.log(`Offer: ${field} = ${pricePerUnit} per unit`);
            prices.push({ raw: pricePerUnit, perUnit: pricePerUnit });
            break;
          }
        }
      }
      
      if (pricePerUnit) continue;
      
      // Priority 3: Check nested price objects
      if (offer.price && typeof offer.price === 'object') {
        const nestedPrice = offer.price.amount || offer.price.value || offer.price.unit_price;
        if (nestedPrice) {
          pricePerUnit = parseFloat(nestedPrice);
          if (!isNaN(pricePerUnit) && pricePerUnit > 0) {
            prices.push({ raw: pricePerUnit, perUnit: pricePerUnit });
          }
        }
      }
    }
    
    if (prices.length === 0) {
      console.log('No valid prices found in offers. First offer keys:', Object.keys(offers[0] || {}));
      console.log('First offer sample:', JSON.stringify(offers[0]).substring(0, 500));
      return null;
    }
    
    // Select 4th/5th lowest price for better market accuracy (avoids dumped prices)
    const allPrices = prices.map(p => p.perUnit);
    const selectedPrice = selectReliablePrice(allPrices);
    console.log(`Found ${allPrices.length} prices, selected reliable price: ${selectedPrice}`);
    
    // Return price per 1 unit (unit = 1)
    // The normalizePrice function will convert to target unit (e.g., per K)
    return { price: selectedPrice, unit: 1 };
  } catch (error) {
    console.error('Error parsing API response:', error);
    return null;
  }
}

// Try to parse content as JSON and extract price
function tryParseAsJson(content: string): { price: number; unit: number } | null {
  const trimmed = content.trim();
  
  // Check if content looks like JSON (raw or wrapped in code blocks)
  let jsonStr = trimmed;
  
  // Remove markdown code block wrapper if present
  if (trimmed.startsWith('```json')) {
    jsonStr = trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (trimmed.startsWith('```')) {
    jsonStr = trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // Check if it's JSON
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    return null;
  }
  
  try {
    console.log('Content appears to be JSON, attempting to parse');
    const data = JSON.parse(jsonStr);
    return extractPriceFromApiResponse(data);
  } catch (e) {
    console.log('Failed to parse as JSON:', e);
    return null;
  }
}

// Extract price from G2G scraped content
function extractPriceFromContent(markdown: string): { price: number; unit: number } | null {
  console.log('Extracting price from content, length:', markdown.length);
  
  // Log first 800 chars for debugging
  console.log('Content preview:', markdown.substring(0, 800));
  
  // G2G-specific patterns for group offer pages
  // These pages typically show prices like "$0.0045/K" or "0.0045 USD/K"
  
  // Pattern 1: G2G specific - prices with /K or per K notation
  const g2gPerKPatterns = [
    // "$0.0045/K" or "$0.0045 / K" - most common G2G format
    /\$\s*([\d.]+)\s*\/\s*[Kk]/,
    // "0.0045 USD/K" or "0.0045USD/K"
    /([\d.]+)\s*USD\s*\/\s*[Kk]/i,
    // "$0.0045 per K" or "$0.0045 per 1K"
    /\$\s*([\d.]+)\s*per\s*1?[Kk]/i,
    // "USD 0.0045/K"
    /USD\s*([\d.]+)\s*\/\s*[Kk]/i,
    // "€0.0045/K" - EUR format
    /[€]\s*([\d.]+)\s*\/\s*[Kk]/,
    // "0.0045 EUR/K"
    /([\d.]+)\s*EUR\s*\/\s*[Kk]/i,
  ];
  
  for (const pattern of g2gPerKPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        console.log('Found G2G price per K:', price);
        return { price, unit: 1000 };
      }
    }
  }
  
  // Pattern 2: G2G group offer page specific patterns
  const groupOfferPatterns = [
    // "Starting from $0.0045" or "starting from $0.0045/K"
    /starting\s*(?:from)?\s*\$\s*([\d.]+)\s*(?:\/\s*[Kk])?/i,
    // "Best price $0.0045"
    /best\s*(?:price)?\s*\$\s*([\d.]+)/i,
    // "Lowest price: $0.0045"
    /lowest\s*(?:price)?[:\s]*\$\s*([\d.]+)/i,
    // "from $0.0045"
    /from\s*\$\s*([\d.]+)/i,
  ];
  
  for (const pattern of groupOfferPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      // G2G gold prices are typically 0.0001 - 0.1 per K
      if (!isNaN(price) && price > 0 && price < 1) {
        console.log('Found G2G group offer price (assuming per K):', price);
        return { price, unit: 1000 };
      }
    }
  }
  
  // Pattern 3: Price with /M or per M notation (per 1,000,000)
  const perMPatterns = [
    /\$\s*([\d.]+)\s*\/\s*[Mm]/,
    /\$\s*([\d.]+)\s*per\s*1?[Mm]/i,
    /USD\s*([\d.]+)\s*\/\s*[Mm]/i,
    /([\d.]+)\s*USD\s*\/\s*[Mm]/i,
  ];
  
  for (const pattern of perMPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        console.log('Found price per M:', price);
        return { price, unit: 1000000 };
      }
    }
  }
  
  // Pattern 4: Look for offers in a table-like structure and select reliable price
  const offerPattern = /\|\s*\$?([\d.]+)\s*\|/g;
  const tablePrices: number[] = [];
  let tableMatch;
  while ((tableMatch = offerPattern.exec(markdown)) !== null) {
    const price = parseFloat(tableMatch[1]);
    if (!isNaN(price) && price > 0 && price < 1) {
      tablePrices.push(price);
    }
  }
  
  if (tablePrices.length > 0) {
    const selectedTablePrice = selectReliablePrice(tablePrices);
    console.log('Found table prices, selected reliable price (assuming per K):', selectedTablePrice);
    return { price: selectedTablePrice, unit: 1000 };
  }
  
  // Pattern 5: Fallback - find all small decimal prices typical for G2G gold
  // G2G gold prices are usually $0.001 - $0.05 per K
  const smallPricePattern = /\$?\s*(0\.0+\d+)/g;
  const smallPrices: number[] = [];
  let smallMatch;
  
  while ((smallMatch = smallPricePattern.exec(markdown)) !== null) {
    const price = parseFloat(smallMatch[1]);
    if (!isNaN(price) && price > 0.0001 && price < 0.1) {
      smallPrices.push(price);
    }
  }
  
  if (smallPrices.length > 0) {
    // Select 4th/5th lowest for better market accuracy
    const selectedSmallPrice = selectReliablePrice(smallPrices);
    console.log('Fallback: Selected reliable small price (assuming per K):', selectedSmallPrice);
    return { price: selectedSmallPrice, unit: 1000 };
  }
  
  // Pattern 6: Simple price patterns for non-gold items
  const simplePricePatterns = [
    /\$\s*([\d.]+)\s*(?:USD)?/,
    /([\d.]+)\s*USD/,
  ];
  
  for (const pattern of simplePricePatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0 && price < 10000) {
        console.log('Found simple price:', price);
        return { price, unit: 1 };
      }
    }
  }
  
  console.log('No price found in content');
  return null;
}

// Normalize price to the target unit
function normalizePrice(extractedPrice: number, extractedUnit: number, targetUnit: number): number {
  // Convert to per-unit price first, then to target unit
  const perUnitPrice = extractedPrice / extractedUnit;
  return perUnitPrice * targetUnit;
}

// Convert regular G2G page URL to sls.g2g.com API URL
function convertToApiUrl(g2gUrl: string): string | null {
  try {
    const url = new URL(g2gUrl);
    
    // Check if it's already an API URL
    if (url.hostname === 'sls.g2g.com') {
      console.log('URL is already an sls.g2g.com API URL');
      return g2gUrl;
    }
    
    // Check if it's a regular G2G page URL
    if (url.hostname !== 'www.g2g.com' && url.hostname !== 'g2g.com') {
      console.log('URL is not a G2G URL:', url.hostname);
      return null;
    }
    
    // Extract seo_term from path: /categories/{seo_term}/offer/group or /categories/{seo_term}/offer
    const pathMatch = url.pathname.match(/\/categories\/([^\/]+)\/offer/);
    if (!pathMatch) {
      console.log('Could not extract seo_term from path:', url.pathname);
      return null;
    }
    
    const seoTerm = pathMatch[1];
    const regionId = url.searchParams.get('region_id');
    const faParam = url.searchParams.get('fa');
    
    console.log(`Extracted from URL - seo_term: ${seoTerm}, region_id: ${regionId}, fa: ${faParam}`);
    
    // Build API URL
    const apiUrl = new URL('https://sls.g2g.com/offer/search');
    apiUrl.searchParams.set('seo_term', seoTerm);
    
    if (regionId) {
      apiUrl.searchParams.set('region_id', regionId);
    }
    
    // Convert fa parameter to filter_attr
    // fa is URL-encoded and uses %3A for colon, but URL parser already decodes it
    if (faParam) {
      apiUrl.searchParams.set('filter_attr', faParam);
    }
    
    // Add default parameters for API request
    apiUrl.searchParams.set('page_size', '20');
    apiUrl.searchParams.set('group', '0');
    apiUrl.searchParams.set('currency', 'USD');
    apiUrl.searchParams.set('country', 'US');
    apiUrl.searchParams.set('v', 'v2');
    
    const result = apiUrl.toString();
    console.log('Generated API URL:', result);
    return result;
  } catch (e) {
    console.error('Error converting to API URL:', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional filtering
    let singleConfigId: string | null = null;
    let singleProductId: string | null = null;
    try {
      const body = await req.json();
      singleConfigId = body?.configId || null;
      singleProductId = body?.productId || null;
    } catch {
      // No body or invalid JSON, sync all
    }

    // Fetch active sync configurations
    let query = supabase
      .from('g2g_price_sync')
      .select(`
        id,
        product_id,
        g2g_url,
        api_url,
        scrape_method,
        price_unit,
        price_unit_label,
        markup_percentage,
        sync_type,
        product_option_id,
        option_label,
        target_seller,
        products!inner (
          id,
          name,
          slider_config,
          is_slider_product
        )
      `)
      .eq('is_active', true);

    if (singleConfigId) {
      query = query.eq('id', singleConfigId);
    } else if (singleProductId) {
      query = query.eq('product_id', singleProductId);
    }

    const { data: syncConfigs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching sync configs:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch sync configurations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!syncConfigs || syncConfigs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active sync configurations found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${syncConfigs.length} sync configurations`);

    const results: SyncResult[] = [];

    for (const config of syncConfigs as unknown as SyncConfig[]) {
      const targetLabel = config.sync_type === 'option' 
        ? `Option: ${config.option_label}` 
        : 'Product Price';
      
      const result: SyncResult = {
        configId: config.id,
        productId: config.product_id,
        productName: config.products.name,
        target: targetLabel,
        success: false,
      };

      try {
        let extracted: { price: number; unit: number } | null = null;
        
        // Try to auto-generate API URL from regular G2G URL
        let effectiveApiUrl = config.api_url;
        let apiUrlWasAutoGenerated = false;
        
        if (!effectiveApiUrl && config.g2g_url) {
          effectiveApiUrl = convertToApiUrl(config.g2g_url);
          if (effectiveApiUrl) {
            apiUrlWasAutoGenerated = true;
            console.log(`Auto-generated API URL from g2g_url`);
          }
        }
        
        // Method 1: Direct API call (preferred - use if we have an API URL, either configured or auto-generated)
        if (effectiveApiUrl) {
          console.log(`Fetching G2G API for ${config.products.name} (${targetLabel}): ${effectiveApiUrl}`);
          
          try {
            const apiResponse = await fetch(effectiveApiUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.g2g.com',
                'Referer': 'https://www.g2g.com/',
              },
            });
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json();
              console.log('API response received, status:', apiResponse.status);
              extracted = extractPriceFromApiResponse(apiData, config.target_seller);
              
              if (extracted) {
                console.log(`API extraction successful: ${extracted.price} per ${extracted.unit} unit(s)`);
              } else {
                console.log('API extraction failed, falling back to scrape method');
              }
            } else {
              console.log(`API call failed with status ${apiResponse.status}, falling back to scrape method`);
            }
          } catch (apiError) {
            console.error('API call error:', apiError);
            console.log('Falling back to scrape method');
          }
        }
        
        // Method 2: Scrape with Firecrawl (fallback or if scrape_method is 'scrape')
        if (!extracted) {
          console.log(`Scraping G2G for ${config.products.name} (${targetLabel}): ${config.g2g_url}`);

          // Scrape G2G page using Firecrawl with enhanced settings
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: config.g2g_url,
              formats: ['markdown', 'html'],
              onlyMainContent: false,
              waitFor: 10000, // Increased wait time for JS rendering
            }),
          });

          const scrapeData = await scrapeResponse.json();

          if (!scrapeResponse.ok || !scrapeData.success) {
            throw new Error(scrapeData.error || `Scrape failed with status ${scrapeResponse.status}`);
          }

          const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
          const html = scrapeData.data?.html || scrapeData.html || '';
          
          if (!markdown && !html) {
            throw new Error('No content returned from scrape');
          }

          console.log(`Scraped content: markdown=${markdown.length} chars, html=${html.length} chars`);

          // First, check if the scraped content is actually JSON (API response)
          // This happens when g2g_url points to an API endpoint
          const jsonExtracted = tryParseAsJson(markdown) || tryParseAsJson(html);
          if (jsonExtracted) {
            console.log('Scraped content was JSON, extracted via API parser');
            extracted = jsonExtracted;
          } else {
            // Try extracting from markdown first, then HTML
            extracted = extractPriceFromContent(markdown);
            
            if (!extracted && html) {
              console.log('Trying HTML content for price extraction');
              extracted = extractPriceFromContent(html);
            }
          }
        }
        
        if (!extracted) {
          throw new Error('Could not extract price from page content. Try configuring an API URL if available.');
        }

        // Determine the G2G price to store
        // If extracted.unit === 1, the API already returned per-unit price (e.g., €0.023 per 1 gold)
        // We store this directly - the slider config uses per-unit pricing
        // If extracted.unit !== 1 (e.g., from scraped "per K"), convert to per-unit
        let g2gPricePerUnit: number;
        
        if (extracted.unit === 1) {
          // API returned per-unit price - use directly
          g2gPricePerUnit = roundPrice(extracted.price);
          console.log(`API returned per-unit price: ${g2gPricePerUnit}`);
        } else {
          // Scraped content returned price per K/M - convert to per-unit
          g2gPricePerUnit = roundPrice(extracted.price / extracted.unit);
          console.log(`Converted from per-${extracted.unit} to per-unit: ${g2gPricePerUnit}`);
        }
        
        // Apply markup to per-unit price
        const ourPrice = roundPrice(g2gPricePerUnit * (1 + config.markup_percentage / 100));

        console.log(`Extracted: ${extracted.price} per ${extracted.unit}, Per-unit: ${g2gPricePerUnit}, Our price: ${ourPrice}`);

        // Validate price is reasonable
        if (ourPrice <= 0 || ourPrice > 1000000) {
          throw new Error(`Invalid calculated price: ${ourPrice}`);
        }

        // Update based on sync type
        if (config.sync_type === 'option' && config.product_option_id && config.option_label) {
          // Option-level sync: Update the specific option's price in product_options
          const { data: productOption, error: optionFetchError } = await supabase
            .from('product_options')
            .select('id, options')
            .eq('id', config.product_option_id)
            .single();

          if (optionFetchError || !productOption) {
            throw new Error(`Failed to fetch product option: ${optionFetchError?.message || 'Not found'}`);
          }

          // Update the matching option's price
          const options = normalizeOptionEntries(productOption.options);
          if (options.length === 0) {
            throw new Error('Selected product option has no valid options array');
          }

          let optionFound = false;
          
          const updatedOptions = options.map(opt => {
            if (opt.label === config.option_label) {
              optionFound = true;
              return { ...opt, price: ourPrice, priceType: 'fixed' };
            }
            return opt;
          });

          if (!optionFound) {
            throw new Error(`Option label "${config.option_label}" not found in product options`);
          }

          const { error: updateError } = await supabase
            .from('product_options')
            .update({ 
              options: updatedOptions,
              updated_at: new Date().toISOString()
            })
            .eq('id', config.product_option_id);

          if (updateError) {
            throw new Error(`Failed to update product option: ${updateError.message}`);
          }

          console.log(`Updated option "${config.option_label}" price to $${ourPrice}`);

        } else {
          // Product-level sync: Check if slider or simple product
          const isSliderProduct = config.products.is_slider_product;
          const sliderConfig = config.products.slider_config;

          if (isSliderProduct && sliderConfig) {
            // Slider product: Update slider_config pricing
            if (sliderConfig.pricing_brackets && Array.isArray(sliderConfig.pricing_brackets) && sliderConfig.pricing_brackets.length > 0) {
              sliderConfig.pricing_brackets[0].price = ourPrice;
            } else if (sliderConfig.price_per_step !== undefined) {
              sliderConfig.price_per_step = ourPrice;
            } else {
              // Create pricing brackets if none exist
              sliderConfig.pricing_brackets = [{ min: 0, max: null, price: ourPrice }];
            }

            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                slider_config: sliderConfig,
                updated_at: new Date().toISOString()
              })
              .eq('id', config.product_id);

            if (updateError) {
              throw new Error(`Failed to update product slider_config: ${updateError.message}`);
            }

            console.log(`Updated slider product slider_config price to $${ourPrice}`);
          } else {
            // Simple product: Update base_price directly
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                base_price: ourPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', config.product_id);

            if (updateError) {
              throw new Error(`Failed to update product base_price: ${updateError.message}`);
            }

            console.log(`Updated simple product base_price to $${ourPrice}`);
          }
        }

        // Update sync config status
        await supabase
          .from('g2g_price_sync')
          .update({
            last_sync_at: new Date().toISOString(),
            last_g2g_price: g2gPricePerUnit,
            last_our_price: ourPrice,
            last_sync_status: 'success',
            last_sync_error: null,
          })
          .eq('id', config.id);

        // Log to price history
        await supabase
          .from('g2g_price_history')
          .insert({
            sync_config_id: config.id,
            g2g_price: g2gPricePerUnit,
            our_price: ourPrice,
            markup_applied: config.markup_percentage,
            price_unit: config.price_unit,
          });

        result.success = true;
        result.g2gPrice = g2gPricePerUnit;
        result.ourPrice = ourPrice;

        console.log(`Successfully synced ${config.products.name} (${targetLabel})`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error syncing ${config.products.name} (${targetLabel}):`, errorMessage);
        
        result.error = errorMessage;

        // Update sync config with error
        await supabase
          .from('g2g_price_sync')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'error',
            last_sync_error: errorMessage,
          })
          .eq('id', config.id);
      }

      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (syncConfigs.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Sync complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} configurations, ${failureCount} failed`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
