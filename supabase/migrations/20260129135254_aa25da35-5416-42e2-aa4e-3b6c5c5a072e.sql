-- Alterar o status padrão de novas contas para 'pending' (aguardando aprovação)
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'pending';