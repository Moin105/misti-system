-- Fix: Ensure product_guarantees.id has DEFAULT gen_random_uuid()
-- Without this, POST inserts that omit id fail with NOT NULL violation.

ALTER TABLE public.product_guarantees
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

