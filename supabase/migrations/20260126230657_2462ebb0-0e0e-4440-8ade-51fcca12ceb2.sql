-- Drop the dependent view first
DROP VIEW IF EXISTS popular_products;

-- Increase base_price precision from 2 to 8 decimal places
-- This allows slider products to use per-unit pricing like 0.00000125
ALTER TABLE products 
ALTER COLUMN base_price TYPE NUMERIC(16,8);

-- Recreate the popular_products view with the same definition
CREATE VIEW popular_products AS
SELECT id,
    name,
    slug,
    short_description,
    description,
    how_it_works,
    requirements,
    base_price,
    image_url,
    badge_text,
    trust_score,
    total_reviews,
    is_active,
    is_featured,
    sort_order,
    created_at,
    updated_at,
    category_id,
    is_slider_product,
    slider_config,
    is_manually_popular,
    CASE
        WHEN is_manually_popular THEN true
        WHEN total_sales > 0 THEN true
        ELSE false
    END AS is_popular
FROM products p
WHERE is_active = true AND (is_manually_popular = true OR total_sales > 0)
ORDER BY is_manually_popular DESC, total_sales DESC;