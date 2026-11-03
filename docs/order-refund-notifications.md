# Order and refund notifications

## New-order email

Set `ORDER_NOTIFICATION_EMAIL` in Vercel to the store mailbox that should receive paid-order alerts. The Resend integration also requires `RESEND_API_KEY` and a verified `EMAIL_FROM` domain. The health endpoint reports the order-notification configuration without exposing mailbox addresses.

Run `supabase/migrations/20261103060000_add_order_notifications.sql` in the Supabase SQL Editor before enabling the application change. The migration adds an idempotent claim so the checkout capture and PayPal webhook cannot send duplicate alerts for the same order.

## PayPal refunds

Configure the PayPal webhook at `/api/paypal/webhook` to deliver `PAYMENT.CAPTURE.REFUNDED` events. The handler records external PayPal refunds as well as refunds initiated from the store, and retries events that previously failed processing.
For PayPal refund resources, the handler resolves the associated capture from the resource's `up` link and records the refund as completed.

Refunds completed before this change will not be replayed automatically. Resend the corresponding `PAYMENT.CAPTURE.REFUNDED` event from PayPal's webhook event history so the store can reconcile it.
