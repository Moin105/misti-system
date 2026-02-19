-- =====================================================
-- CREATE MISSING TABLES FOR DATA MIGRATION
-- These tables are referenced in types.ts but missing from migrations
-- =====================================================

-- 1. Create competitor_configs table
CREATE TABLE IF NOT EXISTS public.competitor_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT,
  scrape_method TEXT,
  is_active BOOLEAN DEFAULT true,
  rate_limit_ms INTEGER DEFAULT 3000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_configs
CREATE POLICY "Admins can manage competitor configs"
  ON public.competitor_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create supported_languages table
CREATE TABLE IF NOT EXISTS public.supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  locale TEXT NOT NULL,
  is_rtl BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  currency_format TEXT,
  date_format TEXT,
  formality TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supported_languages (already granted in 20260126000106)
-- Public read access is already granted

-- 3. Create url_redirects table
CREATE TABLE IF NOT EXISTS public.url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path TEXT NOT NULL,
  destination_path TEXT NOT NULL,
  is_pattern BOOLEAN DEFAULT false,
  status_code INTEGER DEFAULT 301,
  is_active BOOLEAN DEFAULT true,
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for url_redirects (already granted in 20260125235531)
-- Public read access is already granted

-- 4. Create product_mappings table
CREATE TABLE IF NOT EXISTS public.product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_entity_id UUID REFERENCES public.price_entities(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES public.competitor_configs(id) ON DELETE SET NULL,
  competitor_price_id UUID REFERENCES public.competitor_prices(id) ON DELETE SET NULL,
  competitor_url TEXT NOT NULL,
  match_type TEXT,
  match_confidence NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_mappings
CREATE POLICY "Admins can manage product mappings"
  ON public.product_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add product_bg_image_url column to games table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'games' 
    AND column_name = 'product_bg_image_url'
  ) THEN
    ALTER TABLE public.games 
    ADD COLUMN product_bg_image_url TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_competitor_configs_active ON public.competitor_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_url_redirects_source ON public.url_redirects(source_path);
CREATE INDEX IF NOT EXISTS idx_url_redirects_active ON public.url_redirects(is_active);
CREATE INDEX IF NOT EXISTS idx_product_mappings_price_entity ON public.product_mappings(price_entity_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_competitor ON public.product_mappings(competitor_id);

-- Add updated_at triggers
CREATE TRIGGER update_competitor_configs_updated_at
  BEFORE UPDATE ON public.competitor_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supported_languages_updated_at
  BEFORE UPDATE ON public.supported_languages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_url_redirects_updated_at
  BEFORE UPDATE ON public.url_redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_mappings_updated_at
  BEFORE UPDATE ON public.product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
