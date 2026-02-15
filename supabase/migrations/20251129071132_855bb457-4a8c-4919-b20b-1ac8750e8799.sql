-- Add SEO fields to categories table
ALTER TABLE public.categories
ADD COLUMN meta_title TEXT,
ADD COLUMN meta_description TEXT,
ADD COLUMN meta_keywords TEXT,
ADD COLUMN og_image TEXT;

-- Add comment to describe the columns
COMMENT ON COLUMN public.categories.meta_title IS 'Custom SEO title for search engines (50-60 chars recommended)';
COMMENT ON COLUMN public.categories.meta_description IS 'Custom SEO description for search engines (150-160 chars recommended)';
COMMENT ON COLUMN public.categories.meta_keywords IS 'Comma-separated keywords for SEO';
COMMENT ON COLUMN public.categories.og_image IS 'Custom Open Graph image URL for social sharing (1200x630px recommended)';