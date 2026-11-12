ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_images_by_color JSONB NOT NULL DEFAULT '{}'::jsonb;
