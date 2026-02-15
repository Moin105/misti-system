-- Drop the foreign key constraint on products.subcategory_id if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_subcategory_id_fkey;

-- Drop the subcategory_id column from products
ALTER TABLE public.products DROP COLUMN IF EXISTS subcategory_id;

-- Add category_id column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL DEFAULT gen_random_uuid();

-- Update the default to null after adding the column
ALTER TABLE public.products ALTER COLUMN category_id DROP DEFAULT;