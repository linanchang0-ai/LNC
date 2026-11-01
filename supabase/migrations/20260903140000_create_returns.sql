CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT,
  first_name TEXT, last_name TEXT, phone TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  description TEXT, image_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  category TEXT, price NUMERIC(10,2) NOT NULL, old_price NUMERIC(10,2), short_description TEXT,
  description TEXT, materials TEXT[], dimensions TEXT, colors TEXT[], stock TEXT, featured BOOLEAN DEFAULT FALSE,
  limited BOOLEAN DEFAULT FALSE, image_url TEXT, gallery JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id), guest_email TEXT, customer_name TEXT, phone TEXT,
  shipping_address JSONB, total NUMERIC(10,2) NOT NULL, currency TEXT DEFAULT 'MXN',
  payment_status TEXT DEFAULT 'Pendiente de pago', order_status TEXT DEFAULT 'Pendiente de pago',
  paypal_order_id TEXT, paypal_capture_id TEXT, tracking_number TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id), product_name TEXT, price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT, paypal_order_id TEXT, paypal_capture_id TEXT, status TEXT, amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  paypal_order_id TEXT, capture_id TEXT, refund_id TEXT, refund_amount NUMERIC(10,2), refund_status TEXT,
  refund_reason TEXT, refund_date TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Solicitud de devolución',
  images TEXT[] NOT NULL DEFAULT '{}', videos TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT, city TEXT, postal_code TEXT, neighborhood TEXT, street TEXT, number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id TEXT UNIQUE NOT NULL, event_type TEXT,
  payload JSONB, status TEXT DEFAULT 'received', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checkout_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), paypal_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL, user_id UUID REFERENCES auth.users(id), guest_email TEXT,
  customer_name TEXT, phone TEXT, shipping_address JSONB, items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL, shipping NUMERIC(10,2) NOT NULL, total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN', status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checkout_drafts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_refund_id_key ON public.refunds(refund_id) WHERE refund_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product_key ON public.favorites(user_id, product_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;