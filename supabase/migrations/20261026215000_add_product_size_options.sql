ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_options TEXT[] NOT NULL DEFAULT '{}';
