-- Create global review configuration table
CREATE TABLE public.global_review_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  average_rating NUMERIC NOT NULL DEFAULT 4.9,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  trustpilot_url TEXT,
  reviews_io_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_review_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage global review config"
  ON public.global_review_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view global review config"
  ON public.global_review_config
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default configuration
INSERT INTO public.global_review_config (average_rating, total_reviews, trustpilot_url, reviews_io_url)
VALUES (4.9, 0, '', '');