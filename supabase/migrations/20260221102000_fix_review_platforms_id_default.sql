-- Fix: Ensure review_platforms.id has DEFAULT gen_random_uuid()
-- Without this, POST inserts that omit id fail with:
-- "null value in column \"id\" violates not-null constraint"

ALTER TABLE public.review_platforms
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

