CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  minimum_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (minimum_subtotal >= 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);

ALTER TABLE public.checkout_drafts
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;