import { NextResponse } from "next/server";
import { createAdminAuthClient, getAdminRole } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const supabase = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }) ?? []);
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const role = await getAdminRole(data.user?.id);
  return NextResponse.json({ authenticated: Boolean(role), email: data.user?.email ?? null, role });
}