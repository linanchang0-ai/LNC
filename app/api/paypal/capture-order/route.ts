import { NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal-client";
import { getSupabaseServerClient, tableNames } from "@/lib/supabase";
import { sendOrderConfirmation } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { notifyMerchantOfOrder } from "@/lib/order-notifications";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "paypal-capture-order", 20, 60_000);
  if (limited) return limited;
  try {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: "No se recibió la orden de PayPal." }, { status: 400 });
    }
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "No se recibió la orden de PayPal." }, { status: 400 });
    }
    const orderIdValue = (parsedBody as Record<string, unknown>).orderId;
    const orderId = typeof orderIdValue === "string" ? orderIdValue.trim() : "";

    if (!orderId || orderId.length > 128) {
      return NextResponse.json({ error: "No se recibió la orden de PayPal." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "No se pudo conectar con la base de datos para guardar el pedido." }, { status: 503 });
    }
    const { data: existingOrder, error: lookupError } = await supabase.from(tableNames.orders).select("id, order_number, paypal_capture_id, payment_status, guest_email, customer_name, total, currency").eq("paypal_order_id", orderId).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "No se pudo verificar el registro del pedido antes de cobrar." }, { status: 503 });
    if (existingOrder) {
      await notifyMerchantOfOrder(supabase, existingOrder);
      return NextResponse.json({ captured: true, duplicate: true, captureId: existingOrder.paypal_capture_id, status: existingOrder.payment_status, orderNumber: existingOrder.order_number });
    }

    const { data: draft, error: draftError } = await supabase.from("checkout_drafts").select("order_number, total, currency, status").eq("paypal_order_id", orderId).maybeSingle();
    if (draftError || !draft || draft.status !== "created") return NextResponse.json({ error: "El pedido de pago no es válido o ya fue procesado." }, { status: 400 });

    let result: Awaited<ReturnType<typeof capturePayPalOrder>>;
    try {
      result = await capturePayPalOrder(orderId);
    } catch (captureError) {
      const recoveredOrder = await getPayPalOrder(orderId).catch(() => null);
      if (recoveredOrder?.status !== "COMPLETED") throw captureError;
      result = recoveredOrder;
    }
    const purchaseUnit = result.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const captureId = capture?.id ?? null;
    const status = capture?.status ?? result.status;
    const total = Number(capture?.amount?.value ?? purchaseUnit?.amount?.value ?? 0);
    const currency = capture?.amount?.currency_code ?? purchaseUnit?.amount?.currency_code;
    const referenceId = purchaseUnit?.reference_id;
    if (status !== "COMPLETED" || !captureId || referenceId !== draft.order_number || total !== Number(draft.total) || currency !== draft.currency) {
      console.error("PayPal reports a completed capture that does not match the checkout draft.", { orderId, status, referenceId, total, currency });
      return NextResponse.json({ error: "PayPal indica que el pago se completó, pero no pudimos validarlo con el pedido. No vuelvas a pagar; contacta con soporte." }, { status: 409 });
    }

    const { data: recordedOrders, error: recordError } = await supabase.rpc("record_captured_order", {
      p_paypal_order_id: orderId,
      p_paypal_capture_id: captureId,
      p_payment_status: status === "COMPLETED" ? "Pagado" : "Pendiente",
    });
    const orderData = recordedOrders?.[0];
    if (recordError || !orderData) {
      const { data: concurrentlyRecordedOrder, error: recoveryError } = await supabase
        .from(tableNames.orders)
        .select("id, order_number, paypal_capture_id, payment_status, guest_email, customer_name, total, currency")
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      if (!recoveryError && concurrentlyRecordedOrder) {
        await notifyMerchantOfOrder(supabase, concurrentlyRecordedOrder);
        return NextResponse.json({
          captured: true,
          duplicate: true,
          captureId: concurrentlyRecordedOrder.paypal_capture_id ?? captureId,
          status: concurrentlyRecordedOrder.payment_status,
          orderNumber: concurrentlyRecordedOrder.order_number,
        });
      }
      console.error("PayPal capture completed but order recording failed.", { orderId, captureId, code: recordError?.code, message: recordError?.message });
      return NextResponse.json({ error: "PayPal confirmó el pago, pero el pedido aún se está sincronizando. No vuelvas a pagar. Si no aparece en unos minutos, contacta con soporte." }, { status: 503 });
    }
    if (orderData.guest_email) {
      void sendOrderConfirmation({ email: orderData.guest_email, customerName: orderData.customer_name, orderNumber: orderData.order_number, total: orderData.total, currency: orderData.currency })
        .then(async (sent) => {
          if (!sent) {
            console.error("Order confirmation email was not sent.", { orderId: orderData.id });
            return;
          }
          const { error: emailUpdateError } = await supabase.from(tableNames.orders).update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", orderData.id).is("confirmation_email_sent_at", null);
          if (emailUpdateError) console.error("Could not record order confirmation email delivery.", { orderId: orderData.id });
        })
        .catch(() => console.error("Order confirmation email request failed.", { orderId: orderData.id }));
    }
    await notifyMerchantOfOrder(supabase, orderData);

    return NextResponse.json({ result, captured: true, captureId, status, orderNumber: orderData.order_number });
  } catch (error) {
    console.error("PayPal capture confirmation failed.", { error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json(
      { error: "No pudimos verificar el estado del pago con PayPal. No vuelvas a pagar todavía; revisa tu cuenta PayPal o contacta con soporte." },
      { status: 502 },
    );
  }
}
