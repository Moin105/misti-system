-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_public_payment_methods();

-- Recreate the function with new fields
CREATE OR REPLACE FUNCTION public.get_public_payment_methods()
 RETURNS TABLE(id uuid, name text, type text, is_active boolean, fee_text text, logo_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, type, is_active, fee_text, logo_url, created_at, updated_at
  FROM public.payment_methods
  WHERE is_active = true;
$function$;