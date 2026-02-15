-- Add support for single-endpoint slider products with dynamic options
-- Update slider_config to support single endpoint mode and dynamic options

-- Add a comment to document the new structure
COMMENT ON COLUMN products.slider_config IS 'Configuration for slider products. Supports both dual-handle (range) and single-endpoint modes. Structure:
{
  "slider_type": "range" | "single", 
  "min_value": number,
  "max_value": number,
  "step": number,
  "default_start": number (for range),
  "default_end": number (for range),
  "default_value": number (for single),
  "start_label": string,
  "end_label": string,
  "value_label": string (for single),
  "pricing_brackets": [{start, end, price}],
  "price_per_step": number,
  "estimated_time_per_step": number,
  "dynamic_options": [{
    "trigger_value": number,
    "action": "show_option" | "apply_discount" | "unlock_feature",
    "option_name": string,
    "discount_percent": number,
    "message": string
  }]
}';