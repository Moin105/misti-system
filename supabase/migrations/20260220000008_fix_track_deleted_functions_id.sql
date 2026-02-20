-- Fix: Ensure deleted_urls.id is always generated in trigger functions
-- The INSERT statements should explicitly generate UUID for id column

-- First, ensure the table has the default (defense in depth)
ALTER TABLE public.deleted_urls 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix track_deleted_game() function
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
    INSERT INTO deleted_urls (id, url_path, content_type, content_id, original_title, deleted_by)
    VALUES (gen_random_uuid(), game_url, 'game', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Fix track_deleted_product() function
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
    INSERT INTO deleted_urls (id, url_path, content_type, content_id, original_title, deleted_by)
    VALUES (gen_random_uuid(), product_url, 'product', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Fix track_deleted_blog_post() function
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
    INSERT INTO deleted_urls (id, url_path, content_type, content_id, original_title, deleted_by)
    VALUES (gen_random_uuid(), blog_url, 'blog_post', OLD.id, OLD.title, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Fix track_deleted_category() function
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
    INSERT INTO deleted_urls (id, url_path, content_type, content_id, original_title, deleted_by)
    VALUES (gen_random_uuid(), category_url, 'category', OLD.id, OLD.name, auth.uid())
    ON CONFLICT (url_path) DO NOTHING;
  END IF;
  
  RETURN OLD;
END;
$$;
