-- Ensure work_applications inserts can auto-generate primary key IDs.
ALTER TABLE public.work_applications
ALTER COLUMN id SET DEFAULT gen_random_uuid();
