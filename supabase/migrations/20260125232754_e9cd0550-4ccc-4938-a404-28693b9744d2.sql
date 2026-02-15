-- Fix: Drop the ambiguous 3-parameter overload of log_security_event
-- The 9-parameter version with defaults will handle all call patterns
DROP FUNCTION IF EXISTS public.log_security_event(text, uuid, jsonb);

-- Recreate the consolidated function with all parameters having defaults
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_function_name text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_operation_details jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT NULL::text,
  p_event_category text DEFAULT NULL::text,
  p_request_id text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text,
  p_error_code text DEFAULT NULL::text,
  p_error_message text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_severity text;
  v_category text;
BEGIN
  -- Auto-detect severity from function name if not provided
  IF p_severity IS NULL THEN
    v_severity := CASE
      WHEN p_function_name ILIKE '%failed%' OR p_function_name ILIKE '%error%' 
           OR p_function_name ILIKE '%blocked%' OR p_function_name ILIKE '%unauthorized%'
           OR p_function_name ILIKE '%locked%' THEN 'error'
      WHEN p_function_name ILIKE '%invalid%' OR p_function_name ILIKE '%denied%' 
           OR p_function_name ILIKE '%expired%' OR p_function_name ILIKE '%warning%' THEN 'warning'
      WHEN p_function_name ILIKE '%success%' OR p_function_name ILIKE '%completed%' 
           OR p_function_name ILIKE '%verified%' OR p_function_name ILIKE '%granted%' THEN 'success'
      ELSE 'info'
    END;
  ELSE
    v_severity := p_severity;
  END IF;

  -- Auto-detect category from function name if not provided
  IF p_event_category IS NULL THEN
    v_category := CASE
      WHEN p_function_name ILIKE '%login%' OR p_function_name ILIKE '%password%' 
           OR p_function_name ILIKE '%mfa%' OR p_function_name ILIKE '%auth%'
           OR p_function_name ILIKE '%email%' THEN 'authentication'
      WHEN p_function_name ILIKE '%cashback%' OR p_function_name ILIKE '%payment%' 
           OR p_function_name ILIKE '%order%' OR p_function_name ILIKE '%referral%'
           OR p_function_name ILIKE '%coupon%' THEN 'financial'
      WHEN p_function_name ILIKE '%tier%' OR p_function_name ILIKE '%access%' 
           OR p_function_name ILIKE '%role%' OR p_function_name ILIKE '%permission%' THEN 'access_control'
      WHEN p_function_name ILIKE '%admin%' OR p_function_name ILIKE '%user%' THEN 'admin'
      ELSE 'system'
    END;
  ELSE
    v_category := p_event_category;
  END IF;

  INSERT INTO public.security_audit_log (
    function_name,
    user_id,
    operation_details,
    severity,
    event_category,
    request_id,
    user_agent,
    error_code,
    error_message,
    created_at
  ) VALUES (
    p_function_name,
    p_user_id,
    p_operation_details,
    v_severity,
    v_category,
    p_request_id,
    p_user_agent,
    p_error_code,
    p_error_message,
    now()
  );
END;
$function$;