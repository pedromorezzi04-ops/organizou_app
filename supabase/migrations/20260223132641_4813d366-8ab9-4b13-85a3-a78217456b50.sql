
-- 1. System Settings table (admin-only key-value store)
CREATE TABLE public.system_settings (
  key_name TEXT PRIMARY KEY,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read system_settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert system_settings"
ON public.system_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update system_settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete system_settings"
ON public.system_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edge function needs to validate coupons (service role bypasses RLS)

-- 3. Add subscription fields to profiles
ALTER TABLE public.profiles
ADD COLUMN is_legacy BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 4. Mark legacy users (created before 2024-05-20)
UPDATE public.profiles
SET is_legacy = true, subscription_status = 'active'
WHERE created_at < '2024-05-20T00:00:00Z';

-- 5. Set trial_started_at for non-legacy users who don't have it yet
UPDATE public.profiles
SET trial_started_at = created_at
WHERE is_legacy = false AND trial_started_at IS NULL;

-- 6. Seed initial system_settings
INSERT INTO public.system_settings (key_name, key_value) VALUES
('abacatepay_api_key', ''),
('abacatepay_endpoint', 'https://api.abacatepay.com/v1/billing/create');

-- 7. Function to get system setting (security definer for edge functions)
CREATE OR REPLACE FUNCTION public.get_system_setting(_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key_value FROM public.system_settings WHERE key_name = _key
$$;

-- 8. Function to validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coupons WHERE code = _code AND is_active = true
  )
$$;

-- 9. Function to get user subscription info
CREATE OR REPLACE FUNCTION public.get_subscription_info(_user_id UUID)
RETURNS TABLE(
  is_legacy BOOLEAN,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  trial_started_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_legacy, p.subscription_status, p.subscription_expires_at, p.trial_started_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;
