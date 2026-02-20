-- Fix: Set default value for game_genre_assignments.id column to gen_random_uuid()
-- The default was missing, causing INSERT failures

ALTER TABLE public.game_genre_assignments 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default is set
-- SELECT column_default FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'game_genre_assignments' AND column_name = 'id';
-- Should return: gen_random_uuid()
