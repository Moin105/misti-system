-- Create deleted_urls table to track permanently removed content
CREATE TABLE public.deleted_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('product', 'blog_post', 'game', 'category')),
  content_id UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id),
  original_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_deleted_urls_path ON public.deleted_urls(url_path);
CREATE INDEX idx_deleted_urls_deleted_at ON public.deleted_urls(deleted_at);
CREATE INDEX idx_deleted_urls_content_type ON public.deleted_urls(content_type);

-- Enable RLS
ALTER TABLE public.deleted_urls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access (needed for NotFound page to check URLs)
CREATE POLICY "Anyone can read deleted_urls"
ON public.deleted_urls FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage deleted_urls"
ON public.deleted_urls FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Helper function to get product URL from product ID
CREATE OR REPLACE FUNCTION public.get_product_url(product_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_slug TEXT;
  category_slug TEXT;
  game_slug TEXT;
BEGIN
  SELECT p.slug, c.slug, g.slug
  INTO product_slug, category_slug, game_slug
  FROM products p
  JOIN categories c ON p.category_id = c.id
  JOIN games g ON c.game_id = g.id
  WHERE p.id = product_id;
  
  IF product_slug IS NOT NULL AND category_slug IS NOT NULL AND game_slug IS NOT NULL THEN
    RETURN '/game/' || game_slug || '/' || category_slug || '/' || product_slug;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Helper function to get blog post URL
CREATE OR REPLACE FUNCTION public.get_blog_post_url(post_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_slug TEXT;
BEGIN
  SELECT slug INTO post_slug
  FROM blog_posts
  WHERE id = post_id;
  
  IF post_slug IS NOT NULL THEN
    RETURN '/blog/' || post_slug;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Helper function to get game URL
CREATE OR REPLACE FUNCTION public.get_game_url(game_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  game_slug TEXT;
BEGIN
  SELECT slug INTO game_slug
  FROM games
  WHERE id = game_id;
  
  IF game_slug IS NOT NULL THEN
    RETURN '/game/' || game_slug;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Helper function to get category URL
CREATE OR REPLACE FUNCTION public.get_category_url(category_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_slug TEXT;
  game_slug TEXT;
BEGIN
  SELECT c.slug, g.slug
  INTO category_slug, game_slug
  FROM categories c
  JOIN games g ON c.game_id = g.id
  WHERE c.id = category_id;
  
  IF category_slug IS NOT NULL AND game_slug IS NOT NULL THEN
    RETURN '/game/' || game_slug || '/' || category_slug;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger function for product deletion
CREATE OR REPLACE FUNCTION public.track_deleted_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_url TEXT;
BEGIN
  product_url := get_product_url(OLD.id);
  
  IF product_url IS NOT NULL THEN
    INSERT INTO deleted_urls (url_path, content_type, content_id, original_title, deleted_by)
    VALUES (product_url, 'product', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Trigger function for blog post deletion
CREATE OR REPLACE FUNCTION public.track_deleted_blog_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blog_url TEXT;
BEGIN
  blog_url := get_blog_post_url(OLD.id);
  
  IF blog_url IS NOT NULL THEN
    INSERT INTO deleted_urls (url_path, content_type, content_id, original_title, deleted_by)
    VALUES (blog_url, 'blog_post', OLD.id, OLD.title, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Trigger function for game deletion
CREATE OR REPLACE FUNCTION public.track_deleted_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  game_url TEXT;
BEGIN
  game_url := get_game_url(OLD.id);
  
  IF game_url IS NOT NULL THEN
    INSERT INTO deleted_urls (url_path, content_type, content_id, original_title, deleted_by)
    VALUES (game_url, 'game', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Trigger function for category deletion
CREATE OR REPLACE FUNCTION public.track_deleted_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_url TEXT;
BEGIN
  category_url := get_category_url(OLD.id);
  
  IF category_url IS NOT NULL THEN
    INSERT INTO deleted_urls (url_path, content_type, content_id, original_title, deleted_by)
    VALUES (category_url, 'category', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers
CREATE TRIGGER product_deleted_trigger
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION track_deleted_product();

CREATE TRIGGER blog_post_deleted_trigger
BEFORE DELETE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION track_deleted_blog_post();

CREATE TRIGGER game_deleted_trigger
BEFORE DELETE ON public.games
FOR EACH ROW
EXECUTE FUNCTION track_deleted_game();

CREATE TRIGGER category_deleted_trigger
BEFORE DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION track_deleted_category();