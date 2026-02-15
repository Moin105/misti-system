-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_games UUID[],
  applicable_categories UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create coupon_usage table
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discount_amount NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add coupon fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for coupon_usage
CREATE POLICY "Admins can view all coupon usage"
ON public.coupon_usage
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own coupon usage"
ON public.coupon_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert coupon usage"
ON public.coupon_usage
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_cart_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_applicable_total NUMERIC := 0;
  v_item JSONB;
  v_product RECORD;
  v_is_applicable BOOLEAN := false;
BEGIN
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
  
  -- Check usage limit
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached');
  END IF;
  
  -- Check cart applicability
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    SELECT p.*, c.game_id INTO v_product
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = (v_item->>'product_id')::UUID;
    
    v_is_applicable := false;
    
    -- Check if applies to all or specific games/categories
    IF v_coupon.applicable_games IS NULL AND v_coupon.applicable_categories IS NULL THEN
      v_is_applicable := true;
    ELSIF v_coupon.applicable_games IS NOT NULL AND v_product.game_id = ANY(v_coupon.applicable_games) THEN
      v_is_applicable := true;
    ELSIF v_coupon.applicable_categories IS NOT NULL AND v_product.category_id = ANY(v_coupon.applicable_categories) THEN
      v_is_applicable := true;
    END IF;
    
    IF v_is_applicable THEN
      v_applicable_total := v_applicable_total + (v_item->>'total_price')::NUMERIC;
    END IF;
  END LOOP;
  
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
    'discount_amount', ROUND(v_applicable_total * v_coupon.discount_percentage / 100, 2)
  );
END;
$$;

-- Function to apply coupon (increment usage counter)
CREATE OR REPLACE FUNCTION public.apply_coupon_usage(
  p_coupon_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id;
END;
$$;

-- Create updated_at trigger for coupons
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);