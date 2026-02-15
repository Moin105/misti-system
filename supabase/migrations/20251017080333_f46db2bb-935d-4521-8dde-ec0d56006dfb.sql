-- Add fields for popular products tracking
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_manually_popular boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS total_sales integer DEFAULT 0;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_game_popular ON public.products(category_id, is_manually_popular, total_sales DESC) WHERE is_active = true;

-- Create view for popular products that combines manual and automatic selection
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

-- Create function to update product sales count (can be called from edge function after order)
CREATE OR REPLACE FUNCTION public.update_product_sales()
RETURNS trigger AS $$
BEGIN
  -- Increment sales count for the product
  UPDATE public.products
  SET total_sales = COALESCE(total_sales, 0) + NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update sales on new order items
CREATE TRIGGER update_product_sales_trigger
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_product_sales();

-- Grant permissions
GRANT SELECT ON public.popular_products TO authenticated, anon;