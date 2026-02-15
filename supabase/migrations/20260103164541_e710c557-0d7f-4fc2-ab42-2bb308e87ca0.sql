-- Add API URL and scrape method columns to g2g_price_sync table
ALTER TABLE public.g2g_price_sync 
ADD COLUMN IF NOT EXISTS api_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS scrape_method text DEFAULT 'scrape' CHECK (scrape_method IN ('api', 'scrape'));