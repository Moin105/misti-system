-- Fix schema drift where monetary columns on orders became integer.
-- Prevents: invalid input syntax for type integer: "2.11" (22P02)

ALTER TABLE public.orders
ALTER COLUMN total_amount TYPE numeric(12,2) USING total_amount::numeric,
ALTER COLUMN cashback_used TYPE numeric(12,2) USING cashback_used::numeric,
ALTER COLUMN cashback_earned TYPE numeric(12,2) USING cashback_earned::numeric,
ALTER COLUMN coupon_discount TYPE numeric(12,2) USING coupon_discount::numeric,
ALTER COLUMN referral_discount TYPE numeric(12,2) USING referral_discount::numeric;

ALTER TABLE public.orders
ALTER COLUMN total_amount SET DEFAULT 0,
ALTER COLUMN cashback_used SET DEFAULT 0,
ALTER COLUMN cashback_earned SET DEFAULT 0,
ALTER COLUMN coupon_discount SET DEFAULT 0,
ALTER COLUMN referral_discount SET DEFAULT 0;
