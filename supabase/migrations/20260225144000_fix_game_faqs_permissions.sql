-- Fix game_faqs admin CRUD permissions and RLS policies.
-- Resolves 403/42501 "permission denied for table game_faqs" on DELETE.

ALTER TABLE public.game_faqs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.game_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_faqs TO authenticated;

DROP POLICY IF EXISTS "Anyone can view active game FAQs" ON public.game_faqs;
DROP POLICY IF EXISTS "Admins can manage game FAQs" ON public.game_faqs;

CREATE POLICY "Anyone can view active game FAQs"
ON public.game_faqs
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage game FAQs"
ON public.game_faqs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
