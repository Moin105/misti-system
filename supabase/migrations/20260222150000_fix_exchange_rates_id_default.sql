-- Ensure exchange_rates inserts can auto-generate primary key IDs.
ALTER TABLE public.exchange_rates
ALTER COLUMN id SET DEFAULT gen_random_uuid();
