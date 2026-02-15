-- Create game_genres table
CREATE TABLE public.game_genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create junction table for many-to-many relationship between games and genres
CREATE TABLE public.game_genre_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.game_genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_id, genre_id)
);

-- Enable RLS
ALTER TABLE public.game_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_genre_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_genres
CREATE POLICY "Anyone can view active genres"
ON public.game_genres
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage genres"
ON public.game_genres
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for game_genre_assignments
CREATE POLICY "Anyone can view genre assignments"
ON public.game_genre_assignments
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage genre assignments"
ON public.game_genre_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_game_genres_updated_at
BEFORE UPDATE ON public.game_genres
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default genres
INSERT INTO public.game_genres (name, slug, sort_order) VALUES
  ('MMO', 'mmo', 1),
  ('Action RPG', 'action-rpg', 2),
  ('Shooters', 'shooters', 3),
  ('Sports', 'sports', 4),
  ('Other', 'other', 5),
  ('Recently Added', 'recently-added', 6);