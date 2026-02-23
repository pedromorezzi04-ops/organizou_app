
-- Change default status from 'pending' to 'active'
ALTER TABLE public.profiles 
  ALTER COLUMN status SET DEFAULT 'active';

-- Migrate existing pending users to active
UPDATE public.profiles 
  SET status = 'active' 
  WHERE status = 'pending';

-- Update get_user_status to default to 'active' instead of 'pending'
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT status FROM public.profiles WHERE user_id = _user_id),
    'active'
  )
$function$;
