
-- SEC-01: Fix IDOR in get_subscription_info
CREATE OR REPLACE FUNCTION public.get_subscription_info(_user_id uuid)
 RETURNS TABLE(is_legacy boolean, subscription_status text, subscription_expires_at timestamp with time zone, trial_started_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.is_legacy, p.subscription_status, p.subscription_expires_at, p.trial_started_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

-- SEC-02: Fix IDOR in get_user_status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.profiles WHERE user_id = _user_id
      AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))),
    'active'
  )
$$;
