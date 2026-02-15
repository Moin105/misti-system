-- Add is_popular column to games table
ALTER TABLE public.games 
ADD COLUMN is_popular boolean DEFAULT false;

-- Add index for performance when filtering popular games
CREATE INDEX idx_games_is_popular ON public.games(is_popular) WHERE is_popular = true;