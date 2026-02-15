-- Create cashback tiers table
CREATE TABLE public.cashback_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_spending NUMERIC NOT NULL DEFAULT 0,
  cashback_percentage NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(min_spending)
);

-- Enable RLS
ALTER TABLE public.cashback_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cashback_tiers
CREATE POLICY "Anyone can view active tiers"
ON public.cashback_tiers
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage tiers"
ON public.cashback_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add cashback fields to profiles
ALTER TABLE public.profiles
ADD COLUMN cashback_balance NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN total_lifetime_spending NUMERIC DEFAULT 0 NOT NULL;

-- Create cashback transactions table for history
CREATE TABLE public.cashback_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'used')),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cashback_transactions
CREATE POLICY "Users can view own transactions"
ON public.cashback_transactions
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create transactions"
ON public.cashback_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add cashback fields to orders
ALTER TABLE public.orders
ADD COLUMN cashback_used NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN cashback_earned NUMERIC DEFAULT 0 NOT NULL;

-- Create trigger to update profiles updated_at
CREATE TRIGGER update_cashback_tiers_updated_at
BEFORE UPDATE ON public.cashback_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id UUID)
RETURNS TABLE(
  tier_id UUID,
  tier_name TEXT,
  tier_percentage NUMERIC,
  min_spending NUMERIC,
  current_spending NUMERIC,
  next_tier_name TEXT,
  next_tier_min_spending NUMERIC,
  spending_to_next_tier NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_spending NUMERIC;
  v_current_tier RECORD;
  v_next_tier RECORD;
BEGIN
  -- Get user's total spending
  SELECT total_lifetime_spending INTO v_current_spending
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_current_spending IS NULL THEN
    v_current_spending := 0;
  END IF;
  
  -- Get current tier
  SELECT * INTO v_current_tier
  FROM cashback_tiers
  WHERE is_active = true AND min_spending <= v_current_spending
  ORDER BY min_spending DESC
  LIMIT 1;
  
  -- Get next tier
  SELECT * INTO v_next_tier
  FROM cashback_tiers
  WHERE is_active = true AND min_spending > v_current_spending
  ORDER BY min_spending ASC
  LIMIT 1;
  
  -- Return result
  RETURN QUERY SELECT
    v_current_tier.id,
    v_current_tier.name,
    v_current_tier.cashback_percentage,
    v_current_tier.min_spending,
    v_current_spending,
    v_next_tier.name,
    v_next_tier.min_spending,
    CASE 
      WHEN v_next_tier.min_spending IS NOT NULL 
      THEN v_next_tier.min_spending - v_current_spending
      ELSE 0
    END;
END;
$$;

-- Insert default tiers
INSERT INTO public.cashback_tiers (name, min_spending, cashback_percentage, sort_order) VALUES
  ('Bronze', 0, 1.0, 1),
  ('Silver', 100, 2.0, 2),
  ('Gold', 500, 3.0, 3),
  ('Platinum', 1000, 5.0, 4);

-- Update existing profiles to have default cashback values
UPDATE public.profiles
SET cashback_balance = 0, total_lifetime_spending = 0
WHERE cashback_balance IS NULL OR total_lifetime_spending IS NULL;