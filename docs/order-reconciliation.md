# Historical Order Reconciliation

Use this runbook to inspect orders created before the atomic `record_captured_order` migration. Run every query in the Supabase SQL Editor with a service role or database-owner connection. Export the query results before making changes.

## Find Incomplete Orders

This query is read-only. An order is incomplete when it has no payment, no items, or fewer items than its checkout draft.

```sql
WITH order_health AS (
  SELECT
    orders.id,
    orders.order_number,
    orders.paypal_order_id,
    orders.created_at,
    orders.payment_status,
    COUNT(DISTINCT payments.id) AS payment_count,
    COUNT(DISTINCT order_items.id) AS item_count,
    CASE
      WHEN jsonb_typeof(checkout_drafts.items) = 'array' THEN jsonb_array_length(checkout_drafts.items)
      ELSE NULL
    END AS draft_item_count,
    checkout_drafts.id IS NOT NULL AS has_draft
  FROM public.orders
  LEFT JOIN public.payments ON payments.order_id = orders.id
  LEFT JOIN public.order_items ON order_items.order_id = orders.id
  LEFT JOIN public.checkout_drafts ON checkout_drafts.paypal_order_id = orders.paypal_order_id
  GROUP BY orders.id, checkout_drafts.id, checkout_drafts.items
)
SELECT *,
  CASE
    WHEN NOT has_draft THEN 'manual_review_missing_draft'
    WHEN payment_count = 0 AND item_count = 0 THEN 'eligible_for_repair'
    WHEN payment_count = 0 THEN 'eligible_payment_repair_only'
    WHEN item_count = 0 THEN 'eligible_item_repair_only'
    WHEN draft_item_count IS NOT NULL AND item_count < draft_item_count THEN 'manual_review_partial_items'
    ELSE 'complete'
  END AS reconciliation_status
FROM order_health
WHERE payment_count = 0
   OR item_count = 0
   OR (draft_item_count IS NOT NULL AND item_count < draft_item_count)
ORDER BY created_at;
```

## Repair One Eligible Order

Only run this for one row marked `eligible_for_repair`, `eligible_payment_repair_only`, or `eligible_item_repair_only`. Replace `<PAYPAL_ORDER_ID>` with the exact value returned by the diagnostic query. The transaction locks the order and draft, inserts only missing records, and records the action in `admin_audit_logs`.

```sql
BEGIN;

WITH selected_order AS (
  SELECT *
  FROM public.orders
  WHERE paypal_order_id = '<PAYPAL_ORDER_ID>'
  FOR UPDATE
), selected_draft AS (
  SELECT checkout_drafts.*
  FROM public.checkout_drafts
  JOIN selected_order ON selected_order.paypal_order_id = checkout_drafts.paypal_order_id
  FOR UPDATE
), inserted_items AS (
  INSERT INTO public.order_items (order_id, product_id, product_name, price, quantity)
  SELECT
    selected_order.id,
    NULLIF(item.value->>'productId', '')::UUID,
    COALESCE(item.value->>'productName', 'Producto'),
    COALESCE((item.value->>'price')::NUMERIC, 0),
    COALESCE((item.value->>'quantity')::INTEGER, 1)
  FROM selected_order
  JOIN selected_draft ON TRUE
  CROSS JOIN LATERAL jsonb_array_elements(selected_draft.items) AS item(value)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.order_items WHERE order_items.order_id = selected_order.id
  )
  RETURNING id
), inserted_payment AS (
  INSERT INTO public.payments (order_id, payment_method, paypal_order_id, paypal_capture_id, status, amount)
  SELECT
    selected_order.id,
    'PayPal',
    selected_order.paypal_order_id,
    selected_order.paypal_capture_id,
    selected_order.payment_status,
    selected_order.total
  FROM selected_order
  WHERE NOT EXISTS (
    SELECT 1 FROM public.payments WHERE payments.order_id = selected_order.id
  )
  RETURNING id
)
INSERT INTO public.admin_audit_logs (admin_email, action, resource_type, resource_id, details)
SELECT
  '<ADMIN_EMAIL>',
  'reconcile_historical_order',
  'order',
  selected_order.id::TEXT,
  jsonb_build_object(
    'paypal_order_id', selected_order.paypal_order_id,
    'items_inserted', (SELECT COUNT(*) FROM inserted_items),
    'payments_inserted', (SELECT COUNT(*) FROM inserted_payment)
  )
FROM selected_order;

COMMIT;
```

Replace `<ADMIN_EMAIL>` with the administrator performing the operation. Before `COMMIT`, use `ROLLBACK` instead if the affected order or draft is not the intended one.

## Manual Review Cases

Do not run the repair query when the diagnostic status is `manual_review_missing_draft` or `manual_review_partial_items`. Compare the PayPal capture, `webhook_events`, customer communication, and product records first. Document the chosen correction in `admin_audit_logs`.

After reconciliation, rerun the diagnostic query. It should return no rows for repaired orders.