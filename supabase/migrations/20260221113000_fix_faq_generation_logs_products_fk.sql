-- Ensure PostgREST can resolve faq_generation_logs -> products relationship
-- even on environments where the FK was missing or drifted.

-- Prevent FK creation failure by nulling orphan references first.
UPDATE public.faq_generation_logs AS l
SET product_id = NULL
WHERE l.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.products AS p
    WHERE p.id = l.product_id
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'faq_generation_logs_product_id_fkey'
      AND conrelid = 'public.faq_generation_logs'::regclass
  ) THEN
    ALTER TABLE public.faq_generation_logs
      ADD CONSTRAINT faq_generation_logs_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ask PostgREST to reload schema cache so embedded queries see the FK.
NOTIFY pgrst, 'reload schema';
