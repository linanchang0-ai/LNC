import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, hasAdminRole } from "@/lib/admin-auth";
import { SHIPPING_LABEL_BUCKET, signShippingLabel } from "@/lib/shipping-labels";

const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const maxImageBytes = 4 * 1024 * 1024;

async function authorized(request: Request) {
  const auth = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? []);
  const { data } = auth ? await auth.auth.getUser() : { data: { user: null } };
  if (!await hasAdminRole(data.user?.id, ["admin", "operations"])) return null;
  const supabase = createAdminDataClient();
  return supabase ? { supabase, adminEmail: data.user?.email ?? "unknown" } : null;
}

export async function POST(request: Request) {
  const context = await authorized(request);
  if (!context) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });
  const { supabase, adminEmail } = context;

  const formData = await request.formData();
  const orderId = String(formData.get("orderId") ?? "");
  const image = formData.get("image");
  if (!orderId) return NextResponse.json({ error: "订单无效。" }, { status: 400 });
  if (!(image instanceof File)) return NextResponse.json({ error: "请选择面单照片。" }, { status: 400 });
  if (!allowedTypes[image.type]) return NextResponse.json({ error: "图片格式仅支持 JPEG、PNG 或 WebP。" }, { status: 400 });
  if (image.size === 0 || image.size > maxImageBytes) return NextResponse.json({ error: "图片需大于 0 且不超过 4 MB。" }, { status: 400 });

  const { data: order, error: orderError } = await supabase.from("orders").select("id, shipping_label_path").eq("id", orderId).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "订单不存在。请确认已执行数据库迁移。" }, { status: 404 });

  const path = `orders/${order.id}/${crypto.randomUUID()}.${allowedTypes[image.type]}`;
  const { error: uploadError } = await supabase.storage.from(SHIPPING_LABEL_BUCKET).upload(path, await image.arrayBuffer(), { contentType: image.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: `上传失败：${uploadError.message}` }, { status: 400 });

  const { error: updateError } = await supabase.from("orders").update({ shipping_label_path: path }).eq("id", order.id);
  if (updateError) {
    await supabase.storage.from(SHIPPING_LABEL_BUCKET).remove([path]);
    return NextResponse.json({ error: "保存面单失败。" }, { status: 500 });
  }
  if (order.shipping_label_path) await supabase.storage.from(SHIPPING_LABEL_BUCKET).remove([order.shipping_label_path]);
  await supabase.from("admin_audit_logs").insert({ admin_email: adminEmail, action: "uploaded_shipping_label", resource_type: "order", resource_id: order.id, details: {} });
  return NextResponse.json({ ok: true, url: await signShippingLabel(supabase, path) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await authorized(request);
  if (!context) return NextResponse.json({ error: "未登录或无权限。" }, { status: 401 });
  const { supabase, adminEmail } = context;
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "订单无效。" }, { status: 400 });
  const { data: order } = await supabase.from("orders").select("id, shipping_label_path").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "订单不存在。" }, { status: 404 });
  const { error } = await supabase.from("orders").update({ shipping_label_path: null }).eq("id", order.id);
  if (error) return NextResponse.json({ error: "删除面单失败。" }, { status: 500 });
  if (order.shipping_label_path) await supabase.storage.from(SHIPPING_LABEL_BUCKET).remove([order.shipping_label_path]);
  await supabase.from("admin_audit_logs").insert({ admin_email: adminEmail, action: "removed_shipping_label", resource_type: "order", resource_id: order.id, details: {} });
  return NextResponse.json({ ok: true });
}
