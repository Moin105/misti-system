
-- Recreate popular_products view WITHOUT exposing sensitive business metrics
-- This prevents competitors from scraping sales data via the API

DROP VIEW IF EXISTS public.popular_products;

CREATE OR REPLACE VIEW public.popular_products 
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.name,
  p.slug,
  p.short_description,
  p.description,
  p.how_it_works,
  p.requirements,
  p.base_price,
  p.image_url,
  p.badge_text,
  p.trust_score,
  p.total_reviews,
  p.is_active,
  p.is_featured,
  p.sort_order,
  p.created_at,
  p.updated_at,
  p.category_id,
  p.is_slider_product,
  p.slider_config,
  p.is_manually_popular,
  -- Expose is_popular boolean but NOT the actual sales numbers
  CASE 
    WHEN p.is_manually_popular THEN true
    WHEN p.total_sales > 0 THEN true
    ELSE false
  END as is_popular
  -- Removed: total_sales and sales_count columns (competitive intelligence)
FROM public.products p
WHERE p.is_active = true
  AND (p.is_manually_popular = true OR p.total_sales > 0)
ORDER BY 
  p.is_manually_popular DESC,
  p.total_sales DESC;

-- Ensure proper permissions
REVOKE ALL ON public.popular_products FROM PUBLIC;
GRANT SELECT ON public.popular_products TO anon, authenticated;

COMMENT ON VIEW public.popular_products IS 'Public view of popular products. Sales metrics (total_sales, sales_count) are intentionally hidden to prevent competitive intelligence scraping.';
