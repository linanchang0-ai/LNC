CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_order_id_key
ON public.orders (paypal_order_id)
WHERE paypal_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_paypal_order_id_key
ON public.payments (paypal_order_id)
WHERE paypal_order_id IS NOT NULL;