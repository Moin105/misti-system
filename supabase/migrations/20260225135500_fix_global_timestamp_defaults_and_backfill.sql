-- Backfill and harden timestamps/status defaults for admin-visible tables.

-- -------------------------------
-- product_inquiries
-- -------------------------------
UPDATE public.product_inquiries
SET created_at = COALESCE(updated_at, now())
WHERE created_at IS NULL
   OR created_at < '1972-01-01'::timestamptz;

UPDATE public.product_inquiries
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL
   OR updated_at < '1972-01-01'::timestamptz;

UPDATE public.product_inquiries
SET status = 'pending'
WHERE status IS NULL
   OR btrim(status) = '';

ALTER TABLE public.product_inquiries
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- -------------------------------
-- deleted_urls
-- -------------------------------
UPDATE public.deleted_urls
SET deleted_at = COALESCE(created_at, now())
WHERE deleted_at IS NULL
   OR deleted_at < '1972-01-01'::timestamptz;

UPDATE public.deleted_urls
SET created_at = COALESCE(deleted_at, now())
WHERE created_at IS NULL
   OR created_at < '1972-01-01'::timestamptz;

ALTER TABLE public.deleted_urls
  ALTER COLUMN deleted_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN deleted_at SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- -------------------------------
-- orders
-- -------------------------------
UPDATE public.orders
SET created_at = COALESCE(updated_at, now())
WHERE created_at IS NULL
   OR created_at < '1972-01-01'::timestamptz;

UPDATE public.orders
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL
   OR updated_at < '1972-01-01'::timestamptz;

ALTER TABLE public.orders
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
