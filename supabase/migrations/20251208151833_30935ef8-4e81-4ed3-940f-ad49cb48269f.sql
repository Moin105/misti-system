-- Add referral tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN referrer_id uuid REFERENCES public.profiles(id),
ADD COLUMN referral_discount numeric NOT NULL DEFAULT 0;