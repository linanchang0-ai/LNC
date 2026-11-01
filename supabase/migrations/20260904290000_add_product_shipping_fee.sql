ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (shipping_fee >= 0);