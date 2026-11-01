import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal-client";
import { getSupabaseServerClient, tableNames } from "@/lib/supabase";
import { sendOrderConfirmation } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "paypal-capture-order", 20, 60_000);
  if (limited) return limited;
  try {
    const body = (await request.json()) as {
      orderId?: string;
    };
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json({ error: "No se recibió la orden de PayPal." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "No se pudo conectar con la base de datos para guardar el pedido." }, { status: 503 });
    }
    const { data: existingOrder, error: lookupError } = await supabase.from(tableNames.orders).select("id, paypal_capture_id, payment_status").eq("paypal_order_id", orderId).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "No se pudo verificar el registro del pedido antes de cobrar." }, { status: 503 });
    if (existingOrder) return NextResponse.json({ captured: true, duplicate: true, captureId: existingOrder.paypal_capture_id, status: existingOrder.payment_status });

    const { data: draft, error: draftError } = await supabase.from("checkout_drafts").select("order_number, total, currency, status").eq("paypal_order_id", orderId).maybeSingle();
    if (draftError || !draft || draft.status !== "created") return NextResponse.json({ error: "El pedido de pago no es válido o ya fue procesado." }, { status: 400 });

    const result = await capturePayPalOrder(orderId);
    const captureId = result.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const status = result.status ?? "COMPLETED";
    if (supabase) {
      const total = Number(result.purchase_units?.[0]?.amount?.value ?? 0);
      const referenceId = result.purchase_units?.[0]?.reference_id;
      if (status !== "COMPLETED" || referenceId !== draft.order_number || total !== Number(draft.total) || result.purchase_units?.[0]?.amount?.currency_code !== draft.currency) {
        return NextResponse.json({ error: "La confirmación de PayPal no coincide con el pedido." }, { status: 400 });
      }

      const { data: recordedOrders, error: recordError } = await supabase.rpc("record_captured_order", {
        p_paypal_order_id: orderId,
        p_paypal_capture_id: captureId,
        p_payment_status: status === "COMPLETED" ? "Pagado" : "Pendiente",
      });
      const orderData = recordedOrders?.[0];
      if (recordError || !orderData) {
        return NextResponse.json({ error: recordError?.message ?? "No se pudo guardar el pedido." }, { status: 500 });
      }
      if (orderData.guest_email) {
        void sendOrderConfirmation({ email: orderData.guest_email, customerName: orderData.customer_name, orderNumber: orderData.order_number, total: orderData.total, currency: orderData.currency })
          .then((sent) => sent ? supabase.from(tableNames.orders).update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", orderData.id).is("confirmation_email_sent_at", null) : null)
          .catch(() => undefined);
      }
    }

    return NextResponse.json({ result, captured: true, captureId, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos confirmar tu pago." },
      { status: 500 },
    );
  }
}
