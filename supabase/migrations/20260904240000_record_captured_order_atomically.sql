CREATE OR REPLACE FUNCTION public.record_captured_order(
  p_paypal_order_id TEXT,
  p_paypal_capture_id TEXT,
  p_payment_status TEXT DEFAULT 'Pagado'
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  guest_email TEXT,
  customer_name TEXT,
  total NUMERIC,
  currency TEXT,
  confirmation_email_sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  draft checkout_drafts%ROWTYPE;
  recorded_order orders%ROWTYPE;
BEGIN
  SELECT * INTO recorded_order
  FROM orders
  WHERE paypal_order_id = p_paypal_order_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE orders
    SET payment_status = p_payment_status,
        order_status = CASE WHEN p_payment_status = 'Pagado' THEN 'Procesando' ELSE order_status END,
        paypal_capture_id = COALESCE(p_paypal_capture_id, paypal_capture_id)
    WHERE orders.id = recorded_order.id
    RETURNING * INTO recorded_order;

    UPDATE payments
    SET status = p_payment_status,
        paypal_capture_id = COALESCE(p_paypal_capture_id, paypal_capture_id)
    WHERE paypal_order_id = p_paypal_order_id;

    PERFORM confirm_product_inventory(p_paypal_order_id);
    RETURN QUERY SELECT recorded_order.id, recorded_order.order_number, recorded_order.guest_email, recorded_order.customer_name, recorded_order.total, recorded_order.currency, recorded_order.confirmation_email_sent_at;
    RETURN;
  END IF;

  SELECT * INTO draft
  FROM checkout_drafts
  WHERE paypal_order_id = p_paypal_order_id
  FOR UPDATE;

  IF NOT FOUND OR draft.status <> 'created' THEN
    RAISE EXCEPTION 'El borrador del pedido no es válido o ya fue procesado.';
  END IF;

  IF jsonb_typeof(draft.items) <> 'array' OR jsonb_array_length(draft.items) = 0 THEN
    RAISE EXCEPTION 'El pedido capturado no contiene productos.';
  END IF;

  INSERT INTO orders (
    order_number, user_id, guest_email, customer_name, phone, shipping_address,
    total, currency, payment_status, order_status, paypal_order_id, paypal_capture_id
  ) VALUES (
    draft.order_number, draft.user_id, draft.guest_email, COALESCE(draft.customer_name, 'Cliente'), draft.phone, draft.shipping_address,
    draft.total, draft.currency, p_payment_status, CASE WHEN p_payment_status = 'Pagado' THEN 'Procesando' ELSE 'Pendiente' END, p_paypal_order_id, p_paypal_capture_id
  )
  RETURNING * INTO recorded_order;

  INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
  SELECT
    recorded_order.id,
    NULLIF(item.value->>'productId', '')::UUID,
    COALESCE(item.value->>'productName', 'Producto'),
    COALESCE((item.value->>'price')::NUMERIC, 0),
    COALESCE((item.value->>'quantity')::INTEGER, 1)
  FROM jsonb_array_elements(draft.items) AS item(value);

  INSERT INTO payments (order_id, payment_method, paypal_order_id, paypal_capture_id, status, amount)
  VALUES (recorded_order.id, 'PayPal', p_paypal_order_id, p_paypal_capture_id, p_payment_status, draft.total);

  PERFORM confirm_product_inventory(p_paypal_order_id);
  UPDATE checkout_drafts SET status = 'captured' WHERE paypal_order_id = p_paypal_order_id;

  RETURN QUERY SELECT recorded_order.id, recorded_order.order_number, recorded_order.guest_email, recorded_order.customer_name, recorded_order.total, recorded_order.currency, recorded_order.confirmation_email_sent_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_captured_order(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_captured_order(TEXT, TEXT, TEXT) TO service_role;