ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'pending';
ALTER TABLE public.profiles ALTER COLUMN trial_started_at SET DEFAULT NULL;