import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNewOrderNotification } from "@/lib/email";

type CapturedOrder = {
  id: string;
  order_number: string;
  guest_email: string | null;
  customer_name: string | null;
  total: number;
  currency: string | null;
};

export async function notifyMerchantOfOrder(supabase: SupabaseClient, order: CapturedOrder) {
  if (!process.env.ORDER_NOTIFICATION_EMAIL) {
    console.error("New-order email was not sent: ORDER_NOTIFICATION_EMAIL is not configured.", { orderId: order.id });
    return;
  }

  const { data: claimed, error: claimError } = await supabase.rpc("claim_order_notification", { p_order_id: order.id });
  if (claimError) {
    console.error("Could not claim new-order email notification.", { orderId: order.id });
    return;
  }
  if (!claimed) return;

  let sent = false;
  try {
    sent = await sendNewOrderNotification({
      email: order.guest_email,
      customerName: order.customer_name,
      orderNumber: order.order_number,
      total: order.total,
      currency: order.currency,
    });
  } catch {
    console.error("New-order email request failed.", { orderId: order.id });
  }

  const { error: finishError } = await supabase.rpc("finish_order_notification", {
    p_order_id: order.id,
    p_sent: sent,
  });
  if (finishError) console.error("Could not record new-order email notification status.", { orderId: order.id });
  if (!sent) console.error("New-order email was not sent.", { orderId: order.id });
}
