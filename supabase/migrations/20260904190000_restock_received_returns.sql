ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.restock_received_return(p_return_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE return_order_id UUID;
BEGIN
  SELECT order_id INTO return_order_id
  FROM returns
  WHERE id = p_return_id AND restocked_at IS NULL
  FOR UPDATE;

  IF return_order_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE products
  SET inventory_quantity = inventory_quantity + order_item.quantity
  FROM order_items AS order_item
  WHERE order_item.order_id = return_order_id
    AND products.id = order_item.product_id;

  UPDATE returns SET restocked_at = NOW() WHERE id = p_return_id;
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restock_received_return(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restock_received_return(UUID) TO service_role;