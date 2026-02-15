-- Create g2g_price_sync table for storing sync configurations
CREATE TABLE public.g2g_price_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  g2g_url TEXT NOT NULL,
  price_unit INTEGER NOT NULL DEFAULT 1000,
  price_unit_label TEXT NOT NULL DEFAULT 'per 1K',
  markup_percentage NUMERIC NOT NULL DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_g2g_price NUMERIC,
  last_our_price NUMERIC,
  last_sync_status TEXT DEFAULT 'pending',
  last_sync_error TEXT,
  sync_interval_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Create g2g_price_history table for tracking price changes
CREATE TABLE public.g2g_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_config_id UUID NOT NULL REFERENCES public.g2g_price_sync(id) ON DELETE CASCADE,
  g2g_price NUMERIC NOT NULL,
  our_price NUMERIC NOT NULL,
  markup_applied NUMERIC NOT NULL,
  price_unit INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.g2g_price_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.g2g_price_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for g2g_price_sync - admin only
CREATE POLICY "Admins can manage g2g price sync"
  ON public.g2g_price_sync
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for g2g_price_history - admin only
CREATE POLICY "Admins can view price history"
  ON public.g2g_price_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert price history"
  ON public.g2g_price_history
  FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at on g2g_price_sync
CREATE TRIGGER update_g2g_price_sync_updated_at
  BEFORE UPDATE ON public.g2g_price_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_g2g_price_sync_active ON public.g2g_price_sync(is_active) WHERE is_active = true;
CREATE INDEX idx_g2g_price_history_sync_config ON public.g2g_price_history(sync_config_id);