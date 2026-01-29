-- Função para verificar se usuário está pendente de aprovação
CREATE OR REPLACE FUNCTION public.is_user_pending(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'pending'
  )
$$;

-- Atualizar a função is_user_blocked para verificar tanto bloqueado quanto pendente
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status FROM public.profiles WHERE user_id = _user_id),
    'pending'
  )
$$;