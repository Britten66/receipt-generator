ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS billing_period TEXT;
