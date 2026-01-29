-- Remover constraint antigo e criar novo com os 3 valores válidos
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'active', 'blocked'));