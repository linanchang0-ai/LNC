import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limited = await rateLimit(request, "contact-message", 5, 60 * 60_000);
  if (limited) return limited;

  try {
    const body = await request.json() as { name?: string; email?: string; message?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const message = body.message?.trim() ?? "";
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || message.length < 10 || message.length > 4_000) {
      return NextResponse.json({ error: "Indica tu nombre, un email válido y un mensaje de 10 a 4000 caracteres." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) return NextResponse.json({ error: "El servicio de contacto no está disponible." }, { status: 503 });
    const { data, error } = await supabase.from("contact_messages").insert({ name, email, message }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "No se pudo enviar tu mensaje. Inténtalo de nuevo." }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, message: "Recibimos tu mensaje. Te responderemos en un día hábil." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "El mensaje no tiene un formato válido." }, { status: 400 });
  }
}