-- Ensure cart_items inserts can auto-generate primary key IDs.
ALTER TABLE public.cart_items
ALTER COLUMN id SET DEFAULT gen_random_uuid();
