-- Ensure product_inquiries.id auto-generates UUIDs for public contact submissions.
ALTER TABLE public.product_inquiries
ALTER COLUMN id SET DEFAULT gen_random_uuid();
