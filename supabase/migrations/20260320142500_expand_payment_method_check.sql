-- Expand payment_method CHECK constraint to include 'debito' and 'transferencia'
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_payment_method_check
  CHECK (payment_method IN ('dinheiro', 'pix', 'cartao', 'promissoria', 'debito', 'transferencia'));
