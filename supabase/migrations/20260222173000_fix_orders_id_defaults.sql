-- Ensure orders/order_items inserts can auto-generate primary key IDs.
ALTER TABLE public.orders
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.order_items
ALTER COLUMN id SET DEFAULT gen_random_uuid();
