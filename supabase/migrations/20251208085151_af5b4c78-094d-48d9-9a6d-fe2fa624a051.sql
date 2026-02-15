-- Add referral columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC DEFAULT 0;

-- Create referral_config table for admin settings
CREATE TABLE public.referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_percentage NUMERIC NOT NULL DEFAULT 10,
  referee_discount_percentage NUMERIC NOT NULL DEFAULT 5,
  min_order_amount NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral_transactions table
CREATE TABLE public.referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referee_id UUID NOT NULL REFERENCES public.profiles(id),
  order_id UUID REFERENCES public.orders(id),
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  referee_discount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_config
CREATE POLICY "Anyone can view active referral config"
ON public.referral_config FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage referral config"
ON public.referral_config FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for referral_transactions
CREATE POLICY "Users can view own referral transactions"
ON public.referral_transactions FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert referral transactions"
ON public.referral_transactions FOR INSERT
WITH CHECK (auth.uid() = referee_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all referral transactions"
ON public.referral_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to auto-generate referral code on profile creation
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to set referral code on insert
CREATE TRIGGER set_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_code();

-- Update existing profiles with referral codes
DO $$
DECLARE
  profile_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE profiles SET referral_code = new_code WHERE id = profile_record.id;
  END LOOP;
END;
$$;

-- Function to validate and get referral code info
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer RECORD;
  v_config RECORD;
  v_already_referred BOOLEAN;
BEGIN
  -- Get referral config
  SELECT * INTO v_config FROM referral_config WHERE is_active = true LIMIT 1;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Referral program is not active');
  END IF;
  
  -- Check if user already used a referral
  SELECT referred_by IS NOT NULL INTO v_already_referred FROM profiles WHERE id = p_user_id;
  IF v_already_referred THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You have already used a referral code');
  END IF;
  
  -- Get referrer by code
  SELECT id, email, full_name, referral_code INTO v_referrer 
  FROM profiles WHERE UPPER(referral_code) = UPPER(p_code);
  
  IF v_referrer.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid referral code');
  END IF;
  
  -- Cannot refer yourself
  IF v_referrer.id = p_user_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'You cannot use your own referral code');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', v_referrer.id,
    'referrer_name', COALESCE(v_referrer.full_name, split_part(v_referrer.email, '@', 1)),
    'discount_percentage', v_config.referee_discount_percentage,
    'min_order_amount', v_config.min_order_amount
  );
END;
$$;

-- Function to process referral reward after order completion
CREATE OR REPLACE FUNCTION public.process_referral_reward(
  p_order_id UUID,
  p_referee_id UUID,
  p_order_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_config RECORD;
  v_reward_amount NUMERIC;
  v_transaction_exists BOOLEAN;
BEGIN
  -- Get referrer
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_referee_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'No referrer found');
  END IF;
  
  -- Get config
  SELECT * INTO v_config FROM referral_config WHERE is_active = true LIMIT 1;
  
  IF v_config.id IS NULL THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral program not active');
  END IF;
  
  -- Check minimum order amount
  IF p_order_amount < v_config.min_order_amount THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Order below minimum amount');
  END IF;
  
  -- Check if already processed for this referee (first order only)
  SELECT EXISTS(
    SELECT 1 FROM referral_transactions 
    WHERE referee_id = p_referee_id AND status = 'completed'
  ) INTO v_transaction_exists;
  
  IF v_transaction_exists THEN
    RETURN jsonb_build_object('processed', false, 'reason', 'Referral already rewarded');
  END IF;
  
  -- Calculate reward
  v_reward_amount := ROUND(p_order_amount * v_config.referrer_percentage / 100, 2);
  
  -- Create or update transaction
  INSERT INTO referral_transactions (referrer_id, referee_id, order_id, reward_amount, status)
  VALUES (v_referrer_id, p_referee_id, p_order_id, v_reward_amount, 'completed')
  ON CONFLICT (referee_id, referrer_id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    reward_amount = EXCLUDED.reward_amount,
    status = 'completed',
    updated_at = now();
  
  -- Update referrer's cashback balance and stats
  UPDATE profiles SET
    cashback_balance = cashback_balance + v_reward_amount,
    total_referrals = total_referrals + 1,
    referral_earnings = referral_earnings + v_reward_amount,
    updated_at = now()
  WHERE id = v_referrer_id;
  
  -- Record as cashback transaction
  INSERT INTO cashback_transactions (user_id, order_id, amount, transaction_type, description)
  VALUES (v_referrer_id, p_order_id, v_reward_amount, 'referral', 'Referral reward for new customer');
  
  RETURN jsonb_build_object(
    'processed', true,
    'reward_amount', v_reward_amount,
    'referrer_id', v_referrer_id
  );
END;
$$;

-- Insert default referral config
INSERT INTO public.referral_config (referrer_percentage, referee_discount_percentage, min_order_amount, is_active)
VALUES (10, 5, 10, true)
ON CONFLICT DO NOTHING;

-- Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer ON public.referral_transactions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referee ON public.referral_transactions(referee_id);