-- Add slider product configuration columns to products table
ALTER TABLE public.products
ADD COLUMN is_slider_product boolean DEFAULT false,
ADD COLUMN slider_config jsonb DEFAULT NULL;

-- Slider config structure:
-- {
--   "min_value": 1,
--   "max_value": 60,
--   "step": 1,
--   "default_start": 1,
--   "default_end": 60,
--   "start_label": "My level",
--   "end_label": "I want to be",
--   "price_per_step": 10.5,
--   "estimated_time_per_step": 0.5 // in days
-- }

COMMENT ON COLUMN public.products.is_slider_product IS 'Whether this product uses slider-based pricing';
COMMENT ON COLUMN public.products.slider_config IS 'JSON configuration for slider products including min/max values, labels, and pricing';