import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "customer-login", 10, 15 * 60_000);
  if (limited) return limited;
  try {
    const body = await request.json() as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "La autenticación no está configurada." }, { status: 503 });
    }

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
    const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error || !data.user) return NextResponse.json({ error: "El email o la contraseña no son correctos." }, { status: 401 });

    const response = NextResponse.json({ ok: true, user: { email: data.user.email, name: data.user.user_metadata.full_name ?? null } });
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
