import { NextResponse } from "next/server";
import { createAdminAuthClient } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const supabase = createAdminAuthClient(() => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }) ?? []);
  if (supabase) await supabase.auth.signOut();
  const response = NextResponse.json({ ok: true });
  request.headers.get("cookie")?.split(";").forEach((part) => {
    const [name] = part.trim().split("=");
    if (name.startsWith("sb-")) response.cookies.delete(name);
  });
  return response;
}