-- Grant admin role to milanbrezovac@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('03765a40-f338-4035-a2ba-8928fff30834', 'admin'::app_role);

-- Remove admin role from old admin@admin.com account
-- DELETE FROM public.user_roles 
-- WHERE user_id = '39387b0e-f0f4-4fb4-9af6-3f0885460e1b' 
-- AND role = 'admin'::app_role;