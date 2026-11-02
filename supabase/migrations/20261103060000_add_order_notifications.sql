ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS merchant_notification_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merchant_notification_email_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.claim_order_notification(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET merchant_notification_claimed_at = NOW()
  WHERE id = p_order_id
    AND merchant_notification_email_sent_at IS NULL
    AND (
      merchant_notification_claimed_at IS NULL
      OR merchant_notification_claimed_at < NOW() - INTERVAL '10 minutes'
    );
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_order_notification(p_order_id UUID, p_sent BOOLEAN)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders
  SET merchant_notification_email_sent_at = CASE
        WHEN p_sent THEN NOW()
        ELSE merchant_notification_email_sent_at
      END,
      merchant_notification_claimed_at = NULL
  WHERE id = p_order_id;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_order_notification(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_order_notification(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_order_notification(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_order_notification(UUID, BOOLEAN) TO service_role;
