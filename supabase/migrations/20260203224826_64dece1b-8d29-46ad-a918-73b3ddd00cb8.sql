-- Enhanced Coupon System: Add new columns and update functions

-- 1. Add new columns to coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS applicable_products UUID[] DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS show_on_pages TEXT[] DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS promo_banner_text TEXT DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS promo_banner_color TEXT DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_order_only BOOLEAN DEFAULT FALSE;

-- 2. Create index for efficient product lookups
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_products ON coupons USING GIN (applicable_products);
CREATE INDEX IF NOT EXISTS idx_coupons_show_on_pages ON coupons USING GIN (show_on_pages);

-- 3. Update validate_coupon function with enhanced logic
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_user_id uuid, p_cart_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon RECORD;
  v_applicable_total NUMERIC := 0;
  v_cart_total NUMERIC := 0;
  v_item JSONB;
  v_product RECORD;
  v_is_applicable BOOLEAN := false;
  v_non_applicable_items JSONB := '[]'::JSONB;
  v_user_usage_count INTEGER;
  v_user_order_count INTEGER;
BEGIN
  -- Log the operation
  PERFORM log_security_event(
    'validate_coupon',
    p_user_id,
    jsonb_build_object('code', p_code)
  );

  -- Get coupon details
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = UPPER(p_code) AND is_active = true;
  
  -- Check if coupon exists
  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;
  
  -- Check if expired
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;
  
  -- Check global usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;
  
  -- Check per-user usage limit
  IF v_coupon.max_uses_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon the maximum number of times');
    END IF;
  END IF;
  
  -- Check first order only restriction
  IF v_coupon.first_order_only = true AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_order_count
    FROM orders
    WHERE user_id = p_user_id AND status IN ('completed', 'delivered', 'processing');
    
    IF v_user_order_count > 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'This coupon is only valid for first-time orders');
    END IF;
  END IF;
  
  -- Calculate cart total and check item applicability
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    SELECT p.*, p.name as product_name, c.game_id, c.id as cat_id INTO v_product
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = (v_item->>'product_id')::UUID;
    
    v_cart_total := v_cart_total + (v_item->>'total_price')::NUMERIC;
    v_is_applicable := false;
    
    -- Priority: Products > Categories > Games > All
    -- Check product-level restriction first (most specific)
    IF v_coupon.applicable_products IS NOT NULL AND array_length(v_coupon.applicable_products, 1) > 0 THEN
      IF v_product.id = ANY(v_coupon.applicable_products) THEN
        v_is_applicable := true;
      END IF;
    -- Check category restriction
    ELSIF v_coupon.applicable_categories IS NOT NULL AND array_length(v_coupon.applicable_categories, 1) > 0 THEN
      IF v_product.cat_id::TEXT = ANY(v_coupon.applicable_categories) THEN
        v_is_applicable := true;
      END IF;
    -- Check game restriction
    ELSIF v_coupon.applicable_games IS NOT NULL AND array_length(v_coupon.applicable_games, 1) > 0 THEN
      IF v_product.game_id::TEXT = ANY(v_coupon.applicable_games) THEN
        v_is_applicable := true;
      END IF;
    -- No restrictions - applies to all
    ELSE
      v_is_applicable := true;
    END IF;
    
    IF v_is_applicable THEN
      v_applicable_total := v_applicable_total + (v_item->>'total_price')::NUMERIC;
    ELSE
      v_non_applicable_items := v_non_applicable_items || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'product_name', v_product.product_name
      );
    END IF;
  END LOOP;
  
  -- Check minimum order amount
  IF v_coupon.min_order_amount IS NOT NULL AND v_cart_total < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Minimum order amount of $' || v_coupon.min_order_amount::TEXT || ' required'
    );
  END IF;
  
  -- Check if any items are applicable
  IF v_applicable_total = 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not applicable to cart items');
  END IF;
  
  -- Calculate discount
  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_percentage', v_coupon.discount_percentage,
    'applicable_total', v_applicable_total,
    'discount_amount', ROUND(v_applicable_total * v_coupon.discount_percentage / 100, 2),
    'non_applicable_items', v_non_applicable_items,
    'all_items_applicable', jsonb_array_length(v_non_applicable_items) = 0,
    'cart_total', v_cart_total
  );
END;
$function$;

-- 4. Create get_visible_coupons function for page-based banners
CREATE OR REPLACE FUNCTION public.get_visible_coupons(
  p_page_type TEXT,
  p_page_id TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  code TEXT,
  discount_percentage NUMERIC,
  promo_banner_text TEXT,
  promo_banner_color TEXT,
  expires_at TIMESTAMPTZ,
  min_order_amount NUMERIC,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_page_pattern TEXT;
  v_wildcard_pattern TEXT;
BEGIN
  -- Build page patterns to match
  v_page_pattern := p_page_type || ':' || COALESCE(p_page_id, '');
  v_wildcard_pattern := p_page_type || ':*';
  
  RETURN QUERY
  SELECT 
    c.id,
    c.code,
    c.discount_percentage,
    c.promo_banner_text,
    c.promo_banner_color,
    c.expires_at,
    c.min_order_amount,
    c.description
  FROM coupons c
  WHERE c.is_active = true
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND (c.max_uses IS NULL OR c.current_uses < c.max_uses)
    AND c.show_on_pages IS NOT NULL
    AND (
      -- Match exact page type (e.g., 'home')
      p_page_type = ANY(c.show_on_pages)
      -- Match specific page (e.g., 'game:world-of-warcraft')
      OR v_page_pattern = ANY(c.show_on_pages)
      -- Match wildcard (e.g., 'game:*')
      OR v_wildcard_pattern = ANY(c.show_on_pages)
    )
  ORDER BY c.discount_percentage DESC
  LIMIT 3;
END;
$function$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_visible_coupons(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_coupons(TEXT, TEXT) TO anon;