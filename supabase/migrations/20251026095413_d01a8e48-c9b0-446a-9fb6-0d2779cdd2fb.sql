-- Add SEO and content enhancement fields to blog_posts
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS read_time_minutes INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.blog_posts.meta_description IS 'SEO meta description (150-160 characters recommended)';
COMMENT ON COLUMN public.blog_posts.meta_keywords IS 'SEO keywords comma-separated';
COMMENT ON COLUMN public.blog_posts.featured_image IS 'URL to featured/hero image for the post';
COMMENT ON COLUMN public.blog_posts.read_time_minutes IS 'Estimated reading time in minutes';
COMMENT ON COLUMN public.blog_posts.canonical_url IS 'Canonical URL for SEO (if different from post URL)';