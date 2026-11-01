import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limited = await rateLimit(request, "customer-register", 5, 60 * 60_000);
  if (limited) return limited;
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email || !body.password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos." }, { status: 400 });
    }
    if (!emailPattern.test(email) || name.length > 120) {
      return NextResponse.json({ error: "Indica un email válido y un nombre de hasta 120 caracteres." }, { status: 400 });
    }
    if (body.password.length < 10) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 10 caracteres." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!supabaseUrl || !supabaseAnonKey || !siteUrl) {
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password: body.password,
      options: {
        data: { full_name: name || null },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/account`,
      },
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "No pudimos crear la cuenta." }, { status: 400 });

    const response = NextResponse.json({ ok: true, requiresEmailConfirmation: !data.session, user: { email: data.user.email, name: name || null } });
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la cuenta." },
      { status: 500 },
    );
  }
}
