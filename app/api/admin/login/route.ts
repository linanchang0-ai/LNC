import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getAdminRole } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "admin-login", 5, 15 * 60_000);
  if (limited) return limited;
  const { email, password } = await request.json() as { email?: string; password?: string };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!email || !password) return NextResponse.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.json({ error: "La autenticación no está configurada." }, { status: 503 });

  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.headers.get("cookie")?.split(";").map((part) => {
        const [name, ...value] = part.trim().split("=");
        return { name, value: value.join("=") };
      }).filter((cookie) => cookie.name) ?? [],
      setAll: (cookies) => cookies.forEach((cookie) => cookiesToSet.push(cookie)),
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !await getAdminRole(data.user.id)) {
    if (data.session) await supabase.auth.signOut();
    return NextResponse.json({ error: "No tienes permisos para acceder al panel." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}