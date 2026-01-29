-- Dropar função existente e recriar com email
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  business_name text, 
  status text, 
  created_at timestamp with time zone,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, 
    p.user_id, 
    p.business_name, 
    p.status, 
    p.created_at,
    u.email::text
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
$$;