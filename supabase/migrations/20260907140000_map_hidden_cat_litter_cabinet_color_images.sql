UPDATE public.products
SET color_images = jsonb_build_object(
  'Blanco', gallery -> 0,
  'Wenge', gallery -> 1,
  'Beige', gallery -> 2
)
WHERE slug = 'gabinete-oculto-arenero'
  AND jsonb_typeof(gallery) = 'array'
  AND jsonb_array_length(gallery) >= 3
  AND color_images = '{}'::jsonb;