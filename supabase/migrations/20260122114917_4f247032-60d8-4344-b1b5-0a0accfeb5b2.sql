-- Add tax configuration columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN tax_type text DEFAULT NULL,
ADD COLUMN tax_fixed_value numeric DEFAULT 0,
ADD COLUMN tax_percentage numeric DEFAULT 0;

-- Create table for tracking monthly tax payments
CREATE TABLE public.tax_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_month date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone DEFAULT NULL,
  transaction_id UUID DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tax payments" 
ON public.tax_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tax payments" 
ON public.tax_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax payments" 
ON public.tax_payments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax payments" 
ON public.tax_payments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tax_payments_updated_at
BEFORE UPDATE ON public.tax_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint for user_id + reference_month
ALTER TABLE public.tax_payments
ADD CONSTRAINT unique_user_month UNIQUE (user_id, reference_month);