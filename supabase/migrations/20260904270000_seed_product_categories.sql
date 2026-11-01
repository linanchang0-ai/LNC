INSERT INTO public.categories (slug, name, description)
VALUES
  ('hogar', 'Hogar & Diseño', 'Diseño para transformar tu espacio.'),
  ('mascotas', 'Mascotas', 'Premium essentials para quienes forman parte de tu familia.'),
  ('auto', 'Auto', 'Detalles que elevan cada viaje.'),
  ('outdoor', 'Outdoor', 'Diseñado para disfrutar afuera.'),
  ('regalos', 'Regalos', 'Regalos memorables para momentos especiales.')
ON CONFLICT (slug) DO NOTHING;