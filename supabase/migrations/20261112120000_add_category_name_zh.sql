ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_zh TEXT;

UPDATE public.categories SET name_zh = '足球球衣'
  WHERE slug = 'camiseta-de-futbol' AND name_zh IS NULL;

UPDATE public.categories SET name_zh = '篮球球衣'
  WHERE slug = 'camiseta-de-baloncesto' AND name_zh IS NULL;
