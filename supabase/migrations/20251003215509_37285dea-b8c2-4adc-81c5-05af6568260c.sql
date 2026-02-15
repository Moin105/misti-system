-- Add button_group to option_type enum
ALTER TYPE public.option_type ADD VALUE IF NOT EXISTS 'button_group';

-- Add price_modifier_type column to product_options
ALTER TABLE public.product_options 
ADD COLUMN IF NOT EXISTS price_modifier_type text DEFAULT 'fixed' CHECK (price_modifier_type IN ('fixed', 'percentage'));