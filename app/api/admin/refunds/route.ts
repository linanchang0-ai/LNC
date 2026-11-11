import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, hasAdminRole } from "@/lib/admin-auth";
import { refundPayPalCapture } from "@/lib/paypal-client";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "admin-refund", 5, 60 * 60_000);
  if (limited) return limited;
  const auth = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }) ?? []);
  const { data: authData } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!await hasAdminRole(authData.user?.id, ["admin", "finance"])) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });

  let orderId: string | undefined;
  let amount: number | undefined;
  let reason: string | undefined;
  try {
    ({ orderId, amount, reason } = await request.json() as { orderId?: string; amount?: number; reason?: string });
  } catch {
    return NextResponse.json({ error: "请求数据无效。" }, { status: 400 });
  }
  if (!orderId) return NextResponse.json({ error: "订单无效。" }, { status: 400 });

  const supabase = createAdminDataClient();
  if (!supabase) return NextResponse.json({ error: "数据库未配置。" }, { status: 503 });
  const { data: order, error: orderError } = await supabase.from("orders").select("id, total, paypal_order_id, paypal_capture_id, payment_status").eq("id", orderId).single();
  if (orderError || !order?.paypal_capture_id || order.payment_status !== "Pagado") return NextResponse.json({ error: "该订单没有可退款的已支付款项。" }, { status: 400 });
  const refundAmount = amount === undefined ? Number(order.total) : Number(amount);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > Number(order.total)) return NextResponse.json({ error: "退款金额无效。" }, { status: 400 });
  const { data: previousRefunds, error: previousRefundsError } = await supabase.from("refunds").select("refund_amount, refund_status").eq("order_id", order.id).in("refund_status", ["COMPLETED", "PENDING", "Procesado", "Pendiente"]);
  if (previousRefundsError) return NextResponse.json({ error: "无法核对可退款余额。" }, { status: 500 });
  const refundedTotal = (previousRefunds ?? []).reduce((sum, refund) => sum + Number(refund.refund_amount ?? 0), 0);
  if (refundAmount > Number(order.total) - refundedTotal) return NextResponse.json({ error: "退款金额超过可退余额。" }, { status: 400 });

  try {
    const requestKey = crypto.randomUUID();
    const { error: requestError } = await supabase.from("refunds").insert({ order_id: order.id, paypal_order_id: order.paypal_order_id, capture_id: order.paypal_capture_id, refund_request_key: requestKey, refund_amount: refundAmount, refund_status: "REQUESTED", refund_reason: reason?.trim() || null });
    if (requestError?.code === "23505") return NextResponse.json({ error: "该笔款项已有退款正在处理中。" }, { status: 409 });
    if (requestError) return NextResponse.json({ error: "退款申请登记失败。" }, { status: 500 });

    const refund = await refundPayPalCapture(order.paypal_capture_id, refundAmount, requestKey);
    const { error } = await supabase.from("refunds").update({ refund_id: refund.id, refund_status: refund.status ?? "PENDING", refund_date: new Date().toISOString() }).eq("refund_request_key", requestKey);
    if (error) return NextResponse.json({ error: "退款已提交，PayPal 将通过回调更新最终状态。" }, { status: 202 });
    await supabase.from("admin_audit_logs").insert({ admin_email: authData.user?.email ?? "unknown", action: "requested_refund", resource_type: "order", resource_id: order.id, details: { amount: refundAmount, reason: reason?.trim() || null, paypal_request_key: requestKey, refund_id: refund.id ?? null } });
    return NextResponse.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch {
    return NextResponse.json({ error: "退款处理失败。" }, { status: 502 });
  }
}