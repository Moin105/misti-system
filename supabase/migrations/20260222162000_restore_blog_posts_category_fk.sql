-- Restore/repair blog_posts -> blog_categories relationship for PostgREST embeds.
-- Fixes PGRST200 errors when selecting blog_posts with blog_categories(...)

-- Ensure index exists for category lookups.
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);

-- Clean invalid category references so FK can be (re)added safely.
UPDATE public.blog_posts bp
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.blog_categories bc
    WHERE bc.id = bp.category_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'blog_posts_category_id_fkey'
      AND conrelid = 'public.blog_posts'::regclass
  ) THEN
    ALTER TABLE public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_fkey
    FOREIGN KEY (category_id)
    REFERENCES public.blog_categories(id)
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Ask PostgREST to refresh schema cache immediately.
NOTIFY pgrst, 'reload schema';
