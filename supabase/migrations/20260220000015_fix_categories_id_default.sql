-- Fix: Set default value for categories.id column to gen_random_uuid()
-- The default was missing, causing INSERT failures

ALTER TABLE public.categories 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default is set
-- SELECT column_default FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'id';
-- Should return: gen_random_uuid()
