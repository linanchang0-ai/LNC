import { NextResponse } from "next/server";
import { createAdminAuthClient, getAdminRole } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "admin-set-password", 5, 15 * 60_000);
  if (limited) return limited;
  let password: string | undefined;
  try {
    ({ password } = await request.json() as { password?: string });
  } catch {
    return NextResponse.json({ error: "请求数据无效。" }, { status: 400 });
  }
  if (!password || password.length < 10) return NextResponse.json({ error: "密码长度至少为 10 位。" }, { status: 400 });
  const supabase = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }) ?? []);
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !await getAdminRole(data.user?.id)) return NextResponse.json({ error: "会话已失效，请重新登录。" }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: "密码更新失败。" }, { status: 500 });
  return NextResponse.json({ ok: true });
}