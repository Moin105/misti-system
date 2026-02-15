-- =====================================================
-- CORRECTIVE MIGRATION: Add missing public table grants
-- These tables were accidentally omitted from Phase 2
-- =====================================================

-- Footer social links (public UI element)
GRANT SELECT ON public.social_links TO anon, authenticated;

-- Product subcategories (navigation hierarchy)
GRANT SELECT ON public.subcategories TO anon, authenticated;

-- Language support (i18n)
GRANT SELECT ON public.supported_languages TO anon, authenticated;