-- Ensure work applications always get valid timestamps and repair legacy bad values.

UPDATE public.work_applications
SET created_at = COALESCE(updated_at, now())
WHERE created_at IS NULL
   OR created_at < '1972-01-01'::timestamptz;

UPDATE public.work_applications
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL
   OR updated_at < '1972-01-01'::timestamptz;

ALTER TABLE public.work_applications
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
