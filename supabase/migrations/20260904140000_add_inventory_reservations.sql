ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER NOT NULL DEFAULT 0
CHECK (inventory_quantity >= 0);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_reservations_order_product_key
ON public.inventory_reservations (paypal_order_id, product_id);

CREATE INDEX IF NOT EXISTS inventory_reservations_active_expiry_idx
ON public.inventory_reservations (expires_at) WHERE status = 'reserved';

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.release_product_inventory(p_paypal_order_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation RECORD;
BEGIN
  FOR reservation IN SELECT product_id, quantity FROM inventory_reservations WHERE paypal_order_id = p_paypal_order_id AND status = 'reserved' FOR UPDATE LOOP
    UPDATE products SET inventory_quantity = inventory_quantity + reservation.quantity WHERE id = reservation.product_id;
  END LOOP;
  UPDATE inventory_reservations SET status = 'released' WHERE paypal_order_id = p_paypal_order_id AND status = 'reserved';
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_product_inventory(p_paypal_order_id TEXT, p_items JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD;
DECLARE expired_order RECORD;
BEGIN
  FOR expired_order IN SELECT DISTINCT paypal_order_id FROM inventory_reservations WHERE status = 'reserved' AND expires_at < NOW() LOOP
    PERFORM release_product_inventory(expired_order.paypal_order_id);
  END LOOP;
  IF EXISTS (SELECT 1 FROM inventory_reservations WHERE paypal_order_id = p_paypal_order_id) THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS requested("productId" UUID, quantity INTEGER)
    LEFT JOIN products ON products.id = requested."productId"
    GROUP BY requested."productId", products.inventory_quantity
    HAVING products.inventory_quantity IS NULL OR products.inventory_quantity < SUM(requested.quantity)
  ) THEN RETURN FALSE; END IF;
  FOR item IN SELECT "productId", SUM(quantity)::INTEGER AS quantity FROM jsonb_to_recordset(p_items) AS requested("productId" UUID, quantity INTEGER) GROUP BY "productId" LOOP
    UPDATE products SET inventory_quantity = inventory_quantity - item.quantity WHERE id = item."productId";
    INSERT INTO inventory_reservations (paypal_order_id, product_id, quantity, expires_at) VALUES (p_paypal_order_id, item."productId", item.quantity, NOW() + INTERVAL '30 minutes');
  END LOOP;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_product_inventory(p_paypal_order_id TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE inventory_reservations SET status = 'confirmed' WHERE paypal_order_id = p_paypal_order_id AND status = 'reserved';
$$;

REVOKE EXECUTE ON FUNCTION public.release_product_inventory(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_product_inventory(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_product_inventory(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_product_inventory(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_product_inventory(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_product_inventory(TEXT) TO service_role;