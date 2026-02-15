-- Fix existing null price_modifier values
UPDATE product_options
SET 
  price_modifier = 0,
  price_modifier_type = COALESCE(price_modifier_type, 'fixed')
WHERE price_modifier IS NULL;

-- Update any remaining null price_modifier_type values
UPDATE product_options
SET price_modifier_type = 'fixed'
WHERE price_modifier_type IS NULL;

-- Add default values for future inserts
ALTER TABLE product_options 
  ALTER COLUMN price_modifier SET DEFAULT 0;

ALTER TABLE product_options 
  ALTER COLUMN price_modifier_type SET DEFAULT 'fixed';