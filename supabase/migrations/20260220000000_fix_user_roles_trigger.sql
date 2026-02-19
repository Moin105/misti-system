-- Fix handle_new_user() function to explicitly generate UUID for user_roles.id
-- This fixes the error: null value in column "id" of relation "user_roles" violates not-null constraint

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Assign default user role with explicit UUID generation
  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (gen_random_uuid(), NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
