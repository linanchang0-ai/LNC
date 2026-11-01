import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "forgot-password", 3, 60 * 60_000);
  if (limited) return limited;
  try {
    const body = await request.json() as { email?: string; next?: string };
    if (!body.email) {
      return NextResponse.json({ error: "Email es requerido." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!supabaseUrl || !supabaseAnonKey || !siteUrl) {
      return NextResponse.json({ error: "La autenticación no está configurada." }, { status: 503 });
    }

    const next = body.next === "/admin/set-password" ? body.next : "/account/set-password";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    });
    if (error) return NextResponse.json({ error: "No se pudo enviar el enlace. Verifica el correo e inténtalo de nuevo." }, { status: 400 });

    return NextResponse.json({
      ok: true,
      message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el enlace." },
      { status: 500 },
    );
  }
}
