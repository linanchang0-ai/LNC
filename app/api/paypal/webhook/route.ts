import { NextResponse } from "next/server";
import { getSupabaseServerClient, tableNames } from "@/lib/supabase";
import { verifyPayPalWebhook } from "@/lib/paypal-client";
import { sendOrderConfirmation, sendRefundNotification } from "@/lib/email";
import { notifyMerchantOfOrder } from "@/lib/order-notifications";

type CaptureResource = {
  id?: string;
  status?: string;
  amount?: { value?: string; currency_code?: string };
  capture_id?: string;
  update_time?: string;
  seller_receivable_breakdown?: { total_refunded_amount?: { value?: string; currency_code?: string } };
  supplementary_data?: { related_ids?: { order_id?: string; capture_id?: string } };
  links?: { rel?: string; href?: string }[];
};

function getRelatedCaptureId(resource: CaptureResource) {
  const captureLink = resource.links?.find((link) => link.rel === "up")?.href;
  return captureLink?.match(/^https:\/\/api(?:-m)?(?:\.sandbox)?\.paypal\.com\/v2\/payments\/captures\/([^/?#]+)\/?$/)?.[1];
}

async function recordCapturedOrder(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, paypalOrderId: string, resource: CaptureResource) {
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from(tableNames.orders)
    .select("id, order_number, guest_email, customer_name, total, currency, confirmation_email_sent_at")
    .eq("paypal_order_id", paypalOrderId)
    .maybeSingle();
  if (existingOrderError) throw new Error("No se pudo consultar el pedido de PayPal.");

  if (existingOrder) {
    const { data: recordedOrders, error: recordError } = await supabase.rpc("record_captured_order", {
      p_paypal_order_id: paypalOrderId,
      p_paypal_capture_id: resource.id ?? null,
    });
    const order = recordedOrders?.[0];
    if (recordError || !order) throw new Error(recordError?.message ?? "No se pudo confirmar el pedido capturado.");
    if (!order.confirmation_email_sent_at && order.guest_email) {
      const sent = await sendOrderConfirmation({ email: order.guest_email, customerName: order.customer_name, orderNumber: order.order_number, total: order.total, currency: order.currency }).catch(() => false);
      if (sent) await supabase.from(tableNames.orders).update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", order.id).is("confirmation_email_sent_at", null);
    }
    await notifyMerchantOfOrder(supabase, order);
    return;
  }

  const { data: draft, error: draftError } = await supabase
    .from("checkout_drafts")
    .select("order_number, user_id, guest_email, customer_name, phone, shipping_address, items, total, currency")
    .eq("paypal_order_id", paypalOrderId)
    .maybeSingle();
  if (draftError || !draft) throw new Error("No se encontró el borrador del pedido capturado.");

  const paidTotal = Number(resource.amount?.value);
  if (!Number.isFinite(paidTotal) || paidTotal !== Number(draft.total) || resource.amount?.currency_code !== draft.currency) {
    throw new Error("El pago capturado no coincide con el borrador del pedido.");
  }

  const { data: recordedOrders, error: recordError } = await supabase.rpc("record_captured_order", {
    p_paypal_order_id: paypalOrderId,
    p_paypal_capture_id: resource.id ?? null,
  });
  const order = recordedOrders?.[0];
  if (recordError || !order) throw new Error(recordError?.message ?? "No se pudo guardar el pedido capturado.");
  if (order.guest_email) {
    const sent = await sendOrderConfirmation({ email: order.guest_email, customerName: order.customer_name, orderNumber: order.order_number, total: order.total, currency: order.currency }).catch(() => false);
    if (sent) await supabase.from(tableNames.orders).update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", order.id).is("confirmation_email_sent_at", null);
  }
  await notifyMerchantOfOrder(supabase, order);
}

async function notifyCustomerOfRefund(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, captureId: string, refundAmount: number) {
  const { data: order } = await supabase.from(tableNames.orders).select("order_number, guest_email, customer_name, currency").eq("paypal_capture_id", captureId).maybeSingle();
  if (!order?.guest_email) return;
  await sendRefundNotification({ email: order.guest_email, customerName: order.customer_name, orderNumber: order.order_number, currency: order.currency, refundAmount }).catch(() => false);
}

async function recordRefund(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, resource: CaptureResource, eventType: string) {
  if (!resource.id) throw new Error("PayPal refund event is missing its refund ID.");
  const captureId = resource.supplementary_data?.related_ids?.capture_id ?? resource.capture_id ?? getRelatedCaptureId(resource);
  if (!captureId) throw new Error("PayPal refund event is missing its capture ID.");

  const reportedStatus = resource.status ?? (eventType.slice(eventType.lastIndexOf(".") + 1) || "PENDING");
  const refundNowCompleted = ["completed", "procesado", "refunded"].includes(reportedStatus.toLowerCase());
  const status = refundNowCompleted ? "COMPLETED" : reportedStatus;
  const amount = Number(resource.amount?.value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("PayPal refund event has an invalid amount.");

  const { data: existingRefund, error: existingRefundError } = await supabase
    .from(tableNames.refunds)
    .select("id, refund_status, refund_date")
    .eq("refund_id", resource.id)
    .maybeSingle();
  if (existingRefundError) throw new Error("No se pudo consultar el reembolso de PayPal.");

  const refundAlreadyCompleted = ["completed", "procesado", "refunded"].includes((existingRefund?.refund_status ?? "").toLowerCase());
  const update = {
    capture_id: captureId,
    refund_amount: amount,
    refund_status: refundAlreadyCompleted && !refundNowCompleted ? existingRefund?.refund_status : status,
    refund_date: refundNowCompleted ? resource.update_time ?? new Date().toISOString() : existingRefund?.refund_date ?? null,
  };
  if (existingRefund) {
    const { error } = await supabase.from(tableNames.refunds).update(update).eq("id", existingRefund.id);
    if (error) throw new Error("No se pudo actualizar el reembolso de PayPal.");
    await updateOrderRefundStatus(supabase, captureId);
    if (refundNowCompleted && !refundAlreadyCompleted) await notifyCustomerOfRefund(supabase, captureId, amount);
    return;
  }

  const { data: pendingRefund, error: pendingRefundError } = await supabase
    .from(tableNames.refunds)
    .select("id")
    .eq("capture_id", captureId)
    .eq("refund_status", "REQUESTED")
    .is("refund_id", null)
    .maybeSingle();
  if (pendingRefundError) throw new Error("No se pudo buscar una solicitud de reembolso pendiente.");
  if (pendingRefund) {
    const { error } = await supabase.from(tableNames.refunds).update({ ...update, refund_id: resource.id }).eq("id", pendingRefund.id);
    if (error) throw new Error("No se pudo vincular el reembolso de PayPal.");
    await updateOrderRefundStatus(supabase, captureId);
    if (refundNowCompleted) await notifyCustomerOfRefund(supabase, captureId, amount);
    return;
  }

  const { data: order, error: orderError } = await supabase
    .from(tableNames.orders)
    .select("id, paypal_order_id")
    .eq("paypal_capture_id", captureId)
    .maybeSingle();
  if (orderError) throw new Error("No se pudo encontrar el pedido del reembolso de PayPal.");
  if (!order) throw new Error("No se encontró el pedido asociado al reembolso de PayPal.");

  const { error: insertError } = await supabase.from(tableNames.refunds).insert({
    order_id: order.id,
    paypal_order_id: order.paypal_order_id,
    refund_id: resource.id,
    ...update,
  });
  if (insertError) throw new Error("No se pudo registrar el reembolso externo de PayPal.");
  await updateOrderRefundStatus(supabase, captureId);
  if (refundNowCompleted) await notifyCustomerOfRefund(supabase, captureId, amount);
}

async function updateOrderRefundStatus(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, captureId: string) {
  const [{ data: order, error: orderError }, { data: refunds, error: refundsError }] = await Promise.all([
    supabase.from(tableNames.orders).select("id, total").eq("paypal_capture_id", captureId).maybeSingle(),
    supabase.from(tableNames.refunds).select("refund_amount, refund_status").eq("capture_id", captureId),
  ]);
  if (orderError || refundsError) throw new Error("No se pudo actualizar el estado del pedido reembolsado.");
  if (!order) throw new Error("No se encontró el pedido asociado al reembolso de PayPal.");

  const completedRefunds = (refunds ?? [])
    .filter((refund) => ["completed", "procesado"].includes((refund.refund_status ?? "").toLowerCase()))
    .reduce((sum, refund) => sum + Number(refund.refund_amount ?? 0), 0);
  if (completedRefunds >= Number(order.total)) {
    const { error } = await supabase.from(tableNames.orders).update({ payment_status: "Reembolsado" }).eq("id", order.id);
    if (error) throw new Error("No se pudo actualizar el estado de pago reembolsado.");
  }
}

async function recordCaptureRefund(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, resource: CaptureResource) {
  if (!resource.id) throw new Error("PayPal capture refund event is missing its capture ID.");
  const totalRefunded = Number(resource.seller_receivable_breakdown?.total_refunded_amount?.value
    ?? (resource.status === "REFUNDED" ? resource.amount?.value : undefined));
  if (!Number.isFinite(totalRefunded) || totalRefunded <= 0) throw new Error("PayPal capture refund event has an invalid refunded amount.");

  const captureId = resource.id;
  const reconciliationRefundId = `capture-refund-total:${captureId}`;
  const { data: existingRefunds, error: refundsError } = await supabase
    .from(tableNames.refunds)
    .select("id, refund_id, refund_amount, refund_status")
    .eq("capture_id", captureId);
  if (refundsError) throw new Error("No se pudieron consultar los reembolsos del pedido.");

  const reconciledRefund = (existingRefunds ?? []).find((refund) => refund.refund_id === reconciliationRefundId);
  const completedRefunds = (existingRefunds ?? [])
    .filter((refund) => refund.refund_id !== reconciliationRefundId && ["completed", "procesado"].includes((refund.refund_status ?? "").toLowerCase()))
    .reduce((sum, refund) => sum + Number(refund.refund_amount ?? 0), 0);
  let reconciliationAmount = Math.max(0, totalRefunded - completedRefunds);
  for (const pendingRefund of (existingRefunds ?? []).filter((refund) =>
    refund.refund_id !== reconciliationRefundId && ["requested", "pending"].includes((refund.refund_status ?? "").toLowerCase())
  )) {
    if (reconciliationAmount <= 0) break;
    const refundAmount = Math.min(Number(pendingRefund.refund_amount ?? 0), reconciliationAmount);
    if (refundAmount <= 0) continue;
    const { error } = await supabase.from(tableNames.refunds).update({
      refund_amount: refundAmount,
      refund_status: "COMPLETED",
      refund_date: resource.update_time ?? new Date().toISOString(),
    }).eq("id", pendingRefund.id);
    if (error) throw new Error("No se pudo confirmar la solicitud de reembolso conciliada.");
    reconciliationAmount -= refundAmount;
  }

  if (reconciliationAmount === 0 && reconciledRefund) {
    const { error } = await supabase.from(tableNames.refunds).delete().eq("id", reconciledRefund.id);
    if (error) throw new Error("No se pudo conciliar el importe reembolsado.");
  } else if (reconciliationAmount > 0) {
    const reconciliation = {
      capture_id: captureId,
      refund_id: reconciliationRefundId,
      refund_amount: reconciliationAmount,
      refund_status: "COMPLETED",
      refund_reason: "PayPal capture refund reconciliation",
      refund_date: resource.update_time ?? new Date().toISOString(),
    };
    if (reconciledRefund) {
      const { error } = await supabase.from(tableNames.refunds).update(reconciliation).eq("id", reconciledRefund.id);
      if (error) throw new Error("No se pudo actualizar el importe reembolsado.");
    } else {
      const { data: order, error: orderError } = await supabase
        .from(tableNames.orders)
        .select("id, paypal_order_id")
        .eq("paypal_capture_id", captureId)
        .maybeSingle();
      if (orderError) throw new Error("No se pudo encontrar el pedido reembolsado.");
      if (!order) throw new Error("No se encontró el pedido asociado al reembolso de PayPal.");
      const { error } = await supabase.from(tableNames.refunds).insert({
        order_id: order.id,
        paypal_order_id: order.paypal_order_id,
        ...reconciliation,
      });
      if (error) throw new Error("No se pudo registrar el reembolso confirmado por PayPal.");
    }
  }
  await updateOrderRefundStatus(supabase, captureId);
}

export async function POST(request: Request) {
  try {
    const event = await request.json();
    const eventId = event?.id;
    const eventType = event?.event_type;

    if (!eventId) {
      return NextResponse.json({ received: false, error: "Missing event id" }, { status: 400 });
    }

    const verified = await verifyPayPalWebhook(event, request.headers);
    if (!verified) return NextResponse.json({ received: false, error: "Invalid webhook signature" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: eventError } = await supabase.from(tableNames.webhookEvents).insert([
        {
          event_id: eventId,
          event_type: eventType ?? "unknown",
          payload: event,
          status: "verified",
        },
      ]);
      if (eventError?.code === "23505") {
        const { data: existingEvent, error: existingEventError } = await supabase.from(tableNames.webhookEvents).select("status").eq("event_id", eventId).maybeSingle();
        if (existingEventError) throw new Error("No se pudo comprobar el evento de PayPal.");
        if (existingEvent?.status === "processed") return NextResponse.json({ received: true, eventId, eventType, status: "duplicate" });
      } else if (eventError) {
        throw new Error("No se pudo registrar el evento de PayPal.");
      }

      const resource = event.resource as CaptureResource | undefined;
      const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id;
      if (eventType === "PAYMENT.CAPTURE.COMPLETED" && paypalOrderId && resource) {
        await recordCapturedOrder(supabase, paypalOrderId, resource);
      } else if (eventType === "PAYMENT.CAPTURE.PENDING" && paypalOrderId && resource) {
        const { error: orderUpdateError } = await supabase.from(tableNames.orders).update({ payment_status: resource.status ?? "Pendiente", order_status: "Pendiente", paypal_capture_id: resource.id ?? null }).eq("paypal_order_id", paypalOrderId);
        const { error: paymentUpdateError } = await supabase.from(tableNames.payments).update({ status: resource.status ?? "Pendiente", paypal_capture_id: resource.id ?? null }).eq("paypal_order_id", paypalOrderId);
        if (orderUpdateError || paymentUpdateError) throw new Error("No se pudo actualizar el estado del pago pendiente.");
      } else if (eventType === "PAYMENT.CAPTURE.REFUNDED" && resource) {
        if (getRelatedCaptureId(resource)) {
          await recordRefund(supabase, resource, eventType);
        } else {
          await recordCaptureRefund(supabase, resource);
        }
      }
      if (eventType?.startsWith("PAYMENT.REFUND.") && resource?.id) {
        await recordRefund(supabase, resource, eventType);
      }
      const { error: processedError } = await supabase.from(tableNames.webhookEvents).update({ status: "processed" }).eq("event_id", eventId);
      if (processedError) throw new Error("No se pudo marcar el evento de PayPal como procesado.");
    } else {
      return NextResponse.json({ received: false, error: "Database not configured" }, { status: 503 });
    }

    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      status: "processed",
    });
  } catch (error) {
    console.error("PayPal webhook processing failed.", { error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json(
      { received: false, error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}
