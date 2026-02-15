-- Remove redundant SEO columns from product_rewards table
-- Products already have their own SEO fields (meta_description, meta_keywords, og_image, etc.)
-- Rewards content is displayed within the product page, so separate meta fields are unnecessary

ALTER TABLE public.product_rewards DROP COLUMN IF EXISTS meta_title;
ALTER TABLE public.product_rewards DROP COLUMN IF EXISTS meta_description;