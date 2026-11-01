ALTER TABLE public.refunds
ADD COLUMN IF NOT EXISTS refund_request_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_request_key_unique
ON public.refunds (refund_request_key)
WHERE refund_request_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_one_active_capture_unique
ON public.refunds (capture_id)
WHERE refund_status IN ('REQUESTED', 'PENDING');