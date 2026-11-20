import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, getAdminRole } from "@/lib/admin-auth";

export async function PUT(request: Request) {
  const auth = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? []);
  const { data } = auth ? await auth.auth.getUser() : { data: { user: null } };
  const role = await getAdminRole(data.user?.id);
  if (!data.user?.email || (role !== "admin" && role !== "operations")) {
    return NextResponse.json({ error: "未登录或无权限。" }, { status: 403 });
  }
  const supabase = createAdminDataClient();
  if (!supabase) return NextResponse.json({ error: "数据库未配置。" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求数据无效。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("ids" in body) || !Array.isArray(body.ids)
    || body.ids.length === 0 || body.ids.length > 1000
    || body.ids.some((id: unknown) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    || new Set(body.ids).size !== body.ids.length) {
    return NextResponse.json({ error: "分类排序数据无效。" }, { status: 400 });
  }
  const { error } = await supabase.rpc("set_category_order", { category_ids: body.ids });
  if (error) {
    console.error("Failed to save category order:", error);
    if (error.message.includes("category list changed")) {
      return NextResponse.json({ error: "分类列表已发生变化，请刷新页面后重试。" }, { status: 409 });
    }
    return NextResponse.json({ error: "分类排序保存失败，请稍后重试。" }, { status: 500 });
  }
  const audit = await supabase.from("admin_audit_logs").insert({
    admin_email: data.user.email, action: "updated", resource_type: "category", resource_id: "order",
    details: { categoryIds: body.ids },
  });
  if (audit.error) console.error("Failed to record category order audit:", audit.error);
  return NextResponse.json({ ok: true });
}
