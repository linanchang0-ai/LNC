ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_prices JSONB NOT NULL DEFAULT '{}'::jsonb;
