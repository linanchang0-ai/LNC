CREATE TABLE IF NOT EXISTS public.homepage_carousel_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  interval_seconds INTEGER NOT NULL DEFAULT 5 CHECK (interval_seconds BETWEEN 1 AND 60)
);

INSERT INTO public.homepage_carousel_settings (id, interval_seconds)
VALUES ('default', 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.homepage_carousel_settings ENABLE ROW LEVEL SECURITY;
