import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limited = await rateLimit(request, "newsletter", 5, 60 * 60_000);
  if (limited) return limited;

  try {
    const { email } = await request.json() as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase() ?? "";
    if (!emailPattern.test(normalizedEmail)) return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    const supabase = getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "El servicio no está disponible." }, { status: 503 });
    const { error } = await supabase.from("newsletter_subscribers").upsert({ email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "No se pudo guardar tu suscripción." }, { status: 500 });
    return NextResponse.json({ ok: true, message: "¡Gracias! Te avisaremos de nuestras novedades." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
}