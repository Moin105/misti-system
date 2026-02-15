-- Add field to control whether percentage modifiers apply to cumulative total or just base price
ALTER TABLE product_options 
ADD COLUMN percentage_applies_to_cumulative BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN product_options.percentage_applies_to_cumulative IS 
'When true and price_modifier_type is percentage, the percentage applies to (base_price + all previously selected options). When false, percentage applies only to base_price.';