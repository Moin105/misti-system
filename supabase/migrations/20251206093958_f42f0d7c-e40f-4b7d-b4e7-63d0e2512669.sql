-- Phase 2: Add enhanced SEO fields to games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS game_platform text,
ADD COLUMN IF NOT EXISTS robots text DEFAULT 'index,follow',
ADD COLUMN IF NOT EXISTS canonical_url text;