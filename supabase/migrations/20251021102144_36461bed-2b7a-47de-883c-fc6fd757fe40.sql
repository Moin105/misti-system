-- Add fee_text column to payment_methods table for displaying fee information
ALTER TABLE public.payment_methods 
ADD COLUMN fee_text TEXT DEFAULT '0% Fees';

-- Add logo_url column to payment_methods table for payment method logos
ALTER TABLE public.payment_methods 
ADD COLUMN logo_url TEXT;

-- Update existing payment methods to have the default fee text
UPDATE public.payment_methods 
SET fee_text = '0% Fees' 
WHERE fee_text IS NULL;