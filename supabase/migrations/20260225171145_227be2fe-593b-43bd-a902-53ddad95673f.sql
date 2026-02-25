DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE(
  id uuid, user_id uuid, business_name text, status text, 
  created_at timestamptz, email text,
  subscription_status text, subscription_expires_at timestamptz,
  is_legacy boolean, trial_started_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id, 
    p.user_id, 
    p.business_name, 
    p.status, 
    p.created_at,
    u.email::text,
    p.subscription_status,
    p.subscription_expires_at,
    p.is_legacy,
    p.trial_started_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
$$;