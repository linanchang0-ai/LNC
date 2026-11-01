ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
  CHECK (role IN ('admin', 'operations', 'support', 'warehouse', 'finance'));

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_by TEXT;

CREATE OR REPLACE FUNCTION public.receive_return(
  p_return_id UUID,
  p_inspection_notes TEXT,
  p_restock_approved BOOLEAN
)
RETURNS TABLE (id UUID, status TEXT, inspection_notes TEXT, restock_approved BOOLEAN, restocked_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  returned_order_id UUID;
  previous_restocked_at TIMESTAMPTZ;
BEGIN
  SELECT order_id, restocked_at INTO returned_order_id, previous_restocked_at
  FROM returns
  WHERE returns.id = p_return_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La devolución no existe.';
  END IF;

  IF p_restock_approved AND previous_restocked_at IS NULL THEN
    UPDATE products
    SET inventory_quantity = inventory_quantity + order_item.quantity
    FROM order_items AS order_item
    WHERE order_item.order_id = returned_order_id
      AND products.id = order_item.product_id;
  END IF;

  UPDATE returns
  SET status = 'Recibida',
      inspection_notes = NULLIF(BTRIM(p_inspection_notes), ''),
      restock_approved = p_restock_approved,
      restocked_at = CASE
        WHEN p_restock_approved AND previous_restocked_at IS NULL THEN NOW()
        ELSE restocked_at
      END
  WHERE returns.id = p_return_id
  RETURNING returns.id, returns.status, returns.inspection_notes, returns.restock_approved, returns.restocked_at
  INTO id, status, inspection_notes, restock_approved, restocked_at;

  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.receive_return(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_return(UUID, TEXT, BOOLEAN) TO service_role;