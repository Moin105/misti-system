-- Create blog_categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT,
  color TEXT DEFAULT '#8B5CF6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category_id);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_categories
CREATE POLICY "Admins can manage blog categories"
ON public.blog_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active blog categories"
ON public.blog_categories
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, icon_name, color, sort_order) VALUES
  ('Game Guides', 'game-guides', 'Step-by-step tutorials and walkthroughs', 'Gamepad2', '#8B5CF6', 1),
  ('News & Updates', 'news-updates', 'Latest industry news and patch notes', 'Newspaper', '#3B82F6', 2),
  ('Tips & Tricks', 'tips-tricks', 'Quick tips and strategies', 'Lightbulb', '#F59E0B', 3),
  ('Reviews', 'reviews', 'Game and service reviews', 'Star', '#EF4444', 4),
  ('Community', 'community', 'Community highlights and stories', 'Users', '#10B981', 5);