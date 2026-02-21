-- Fix missing UUID default for game_faqs.id to prevent null-id inserts.
ALTER TABLE public.game_faqs
ALTER COLUMN id SET DEFAULT gen_random_uuid();
