-- Fix Critical Security Issues

-- 1. Remove conflicting RLS policy that exposes payment_methods config to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view active payment methods" ON public.payment_methods;

-- 2. Create security definer function to safely expose only non-sensitive payment method fields
CREATE OR REPLACE FUNCTION public.get_public_payment_methods()
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, type, is_active, created_at, updated_at
  FROM public.payment_methods
  WHERE is_active = true;
$$;