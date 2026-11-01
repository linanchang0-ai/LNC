import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "coupon-validate", 20, 60_000);
  if (limited) return limited;

  let body: { code?: string; subtotal?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase() ?? "";
  const subtotal = Number(body.subtotal);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) return NextResponse.json({ error: "El cupón o el subtotal no son válidos." }, { status: 400 });

  const database = getSupabaseServerClient();
  if (!database) return NextResponse.json({ error: "No se pudo validar el cupón." }, { status: 503 });
  const { data: coupon, error } = await database.from("promo_codes").select("code, discount_type, discount_value, minimum_subtotal, starts_at, expires_at, max_uses, uses_count, is_active").eq("code", code).maybeSingle();
  const now = Date.now();
  const unavailable = error || !coupon || !coupon.is_active || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) || (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses);
  if (unavailable) return NextResponse.json({ error: "Este cupón no está disponible." }, { status: 400 });
  if (subtotal < Number(coupon.minimum_subtotal)) return NextResponse.json({ error: `Este cupón requiere una compra mínima de MXN ${Number(coupon.minimum_subtotal).toFixed(2)}.` }, { status: 400 });

  const discount = coupon.discount_type === "percentage" ? subtotal * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
  return NextResponse.json({ code: coupon.code, discount: Math.min(subtotal, Math.round(discount * 100) / 100) });
}