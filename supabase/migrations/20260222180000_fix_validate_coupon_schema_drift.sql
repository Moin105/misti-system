-- Fix validate_coupon runtime errors when applicability columns drift to text-like values.
-- Error addressed: function array_length(text, integer) does not exist (42883)

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_user_id uuid,
  p_cart_items jsonb
)
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
  v_user_usage_count INTEGER := 0;
  v_user_order_count INTEGER := 0;
  v_item_total NUMERIC := 0;

  -- Text representations to support both array and text drifted schemas.
  v_applicable_products_text TEXT := '';
  v_applicable_categories_text TEXT := '';
  v_applicable_games_text TEXT := '';
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(TRIM(p_code)) AND is_active = true;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon has expired');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this coupon the maximum number of times');
    END IF;
  END IF;

  IF COALESCE(v_coupon.first_order_only, false) = true AND p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_order_count
    FROM public.orders
    WHERE user_id = p_user_id
      AND status IN ('processing', 'completed');

    IF v_user_order_count > 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'This coupon is only valid for first-time orders');
    END IF;
  END IF;

  v_applicable_products_text := COALESCE(v_coupon.applicable_products::text, '');
  v_applicable_categories_text := COALESCE(v_coupon.applicable_categories::text, '');
  v_applicable_games_text := COALESCE(v_coupon.applicable_games::text, '');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    SELECT
      p.id,
      p.name AS product_name,
      p.category_id AS cat_id,
      c.game_id
    INTO v_product
    FROM public.products p
    JOIN public.categories c ON p.category_id = c.id
    WHERE p.id = (v_item->>'product_id')::UUID;

    v_item_total := COALESCE(NULLIF(v_item->>'total_price', '')::NUMERIC, 0);
    v_cart_total := v_cart_total + v_item_total;
    v_is_applicable := false;

    -- Priority: products > categories > games > all
    IF v_applicable_products_text NOT IN ('', '{}', '[]') THEN
      IF position(v_product.id::text in v_applicable_products_text) > 0 THEN
        v_is_applicable := true;
      END IF;
    ELSIF v_applicable_categories_text NOT IN ('', '{}', '[]') THEN
      IF position(v_product.cat_id::text in v_applicable_categories_text) > 0 THEN
        v_is_applicable := true;
      END IF;
    ELSIF v_applicable_games_text NOT IN ('', '{}', '[]') THEN
      IF position(v_product.game_id::text in v_applicable_games_text) > 0 THEN
        v_is_applicable := true;
      END IF;
    ELSE
      v_is_applicable := true;
    END IF;

    IF v_is_applicable THEN
      v_applicable_total := v_applicable_total + v_item_total;
    ELSE
      v_non_applicable_items := v_non_applicable_items || jsonb_build_object(
        'product_id', v_item->>'product_id',
        'product_name', v_product.product_name
      );
    END IF;
  END LOOP;

  IF v_coupon.min_order_amount IS NOT NULL AND v_cart_total < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Minimum order amount of $' || v_coupon.min_order_amount::TEXT || ' required'
    );
  END IF;

  IF v_applicable_total = 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon not applicable to cart items');
  END IF;

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

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, jsonb) TO anon, authenticated, service_role;
