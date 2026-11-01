CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  old_price NUMERIC(10,2),
  short_description TEXT,
  description TEXT,
  materials TEXT[],
  dimensions TEXT,
  colors TEXT[],
  stock TEXT,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  featured BOOLEAN DEFAULT FALSE,
  limited BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  gallery JSONB,
  detail_images JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  guest_email TEXT,
  customer_name TEXT,
  phone TEXT,
  shipping_address JSONB,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'MXN',
  payment_status TEXT DEFAULT 'Pendiente de pago',
  order_status TEXT DEFAULT 'Pendiente de pago',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT,
  price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  status TEXT,
  amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  paypal_order_id TEXT,
  capture_id TEXT,
  refund_id TEXT,
  refund_amount NUMERIC(10,2),
  refund_status TEXT,
  refund_reason TEXT,
  refund_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT,
  description TEXT,
  status TEXT DEFAULT 'Solicitud de devolución',
  images TEXT[],
  videos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  neighborhood TEXT,
  street TEXT,
  number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
