ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_email_sent_at TIMESTAMPTZ;