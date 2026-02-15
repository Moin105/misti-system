-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table for storing exchange rates
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate NUMERIC(10, 6) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policies for exchange_rates
CREATE POLICY "Anyone can view exchange rates"
  ON public.exchange_rates
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exchange rates"
  ON public.exchange_rates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default rates (USD as base)
INSERT INTO public.exchange_rates (base_currency, target_currency, rate) VALUES
  ('USD', 'USD', 1.000000),
  ('USD', 'EUR', 0.920000)
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- Create function to update exchange rates (will be called by edge function)
CREATE OR REPLACE FUNCTION public.update_exchange_rate(
  p_base_currency TEXT,
  p_target_currency TEXT,
  p_rate NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.exchange_rates (base_currency, target_currency, rate, last_updated)
  VALUES (p_base_currency, p_target_currency, p_rate, now())
  ON CONFLICT (base_currency, target_currency) 
  DO UPDATE SET 
    rate = EXCLUDED.rate,
    last_updated = EXCLUDED.last_updated;
END;
$$;