-- Fix: Ensure id column in g2g_price_sync has DEFAULT gen_random_uuid()
-- This fixes "null value in column "id" violates not-null constraint" errors

-- Set default value for id column if not already set
ALTER TABLE public.g2g_price_sync 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default is set
-- SELECT column_name, column_default 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'g2g_price_sync' 
--   AND column_name = 'id';
