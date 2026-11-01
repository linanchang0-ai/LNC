CREATE OR REPLACE FUNCTION public.track_redeemed_promo_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'captured' AND NEW.status = 'captured' AND NEW.coupon_code IS NOT NULL THEN
    UPDATE public.promo_codes
    SET uses_count = uses_count + 1
    WHERE code = NEW.coupon_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_redeemed_promo_code ON public.checkout_drafts;
CREATE TRIGGER track_redeemed_promo_code
  AFTER UPDATE OF status ON public.checkout_drafts
  FOR EACH ROW EXECUTE FUNCTION public.track_redeemed_promo_code();