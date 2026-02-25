CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'received',
  event_type text,
  user_id uuid
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view webhook_logs"
  ON public.webhook_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete webhook_logs"
  ON public.webhook_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));