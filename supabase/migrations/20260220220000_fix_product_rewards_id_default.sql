-- Fix: Set default value for product_rewards.id column to gen_random_uuid()
-- The default was missing, causing INSERT failures with "null value in column id violates not-null constraint"

ALTER TABLE public.product_rewards 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default is set
-- SELECT column_default FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'product_rewards' AND column_name = 'id';
-- Should return: gen_random_uuid()
