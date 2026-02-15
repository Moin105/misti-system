-- Add meta_title column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title text;