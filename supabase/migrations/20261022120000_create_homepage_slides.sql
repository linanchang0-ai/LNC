CREATE TABLE IF NOT EXISTS public.homepage_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  href TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS homepage_slides_active_order_idx
  ON public.homepage_slides (is_active, sort_order, created_at);

ALTER TABLE public.homepage_slides ENABLE ROW LEVEL SECURITY;