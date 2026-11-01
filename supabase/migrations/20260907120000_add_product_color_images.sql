ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_images JSONB NOT NULL DEFAULT '{}'::jsonb;