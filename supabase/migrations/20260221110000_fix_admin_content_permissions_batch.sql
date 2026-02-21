-- Batch fix for admin content/settings pages:
-- 1) Grant INSERT/UPDATE/DELETE on admin-managed tables
-- 2) Ensure UUID id columns auto-generate with gen_random_uuid()

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'about_stats',
    'blog_categories',
    'blog_posts',
    'cms_pages',
    'how_it_works_steps',
    'why_we_features',
    'service_highlights',
    'site_faqs',
    'chat_integration',
    'discord_config',
    'contact_info',
    'footer_sections',
    'footer_links',
    'social_links',
    'cookie_categories',
    'cookie_banner_config',
    'deleted_urls',
    'url_redirects',
    'site_security_settings',
    'product_trust_badges'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO anon', tbl);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'about_stats',
    'blog_categories',
    'blog_posts',
    'cms_pages',
    'how_it_works_steps',
    'why_we_features',
    'service_highlights',
    'site_faqs',
    'chat_integration',
    'discord_config',
    'contact_info',
    'footer_sections',
    'footer_links',
    'social_links',
    'cookie_categories',
    'cookie_banner_config',
    'deleted_urls',
    'url_redirects',
    'site_security_settings',
    'product_trust_badges'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
        tbl
      );
    END IF;
  END LOOP;
END $$;

