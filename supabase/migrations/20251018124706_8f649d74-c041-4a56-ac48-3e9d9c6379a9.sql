-- Fix security definer view by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.popular_products;

CREATE OR REPLACE VIEW public.popular_products AS
SELECT 
  p.*,
  CASE 
    WHEN p.is_manually_popular THEN true
    WHEN p.total_sales > 0 THEN true
    ELSE false
  END as is_popular,
  p.total_sales as sales_count
FROM public.products p
WHERE p.is_active = true
  AND (p.is_manually_popular = true OR p.total_sales > 0)
ORDER BY 
  p.is_manually_popular DESC,
  p.total_sales DESC;