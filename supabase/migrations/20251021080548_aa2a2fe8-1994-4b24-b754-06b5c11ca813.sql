-- Add start time and delivery information columns to products table
ALTER TABLE public.products
ADD COLUMN start_time_text text DEFAULT '15 minutes',
ADD COLUMN start_time_value text DEFAULT 'average start time',
ADD COLUMN delivery_text text DEFAULT 'Flexible',
ADD COLUMN delivery_value text DEFAULT 'order completion';