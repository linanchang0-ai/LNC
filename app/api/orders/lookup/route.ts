import { NextResponse } from "next/server";
import { getSupabaseServerClient, tableNames } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await rateLimit(request, "guest-order-lookup", 8, 15 * 60_000);
  if (limited) return limited;

  try {
    const { orderNumber, email } = await request.json() as { orderNumber?: string; email?: string };
    const normalizedOrderNumber = orderNumber?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedOrderNumber || !normalizedEmail) {
      return NextResponse.json({ error: "Indica tu número de pedido y el correo usado en la compra." }, { status: 400 });
    }

    const database = getSupabaseServerClient();
    if (!database) return NextResponse.json({ error: "La consulta de pedidos no está disponible." }, { status: 503 });
    const { data: order, error } = await database.from(tableNames.orders)
      .select("id, order_number, total, currency, order_status, payment_status, tracking_number, shipping_carrier, shipped_at, created_at")
      .eq("order_number", normalizedOrderNumber)
      .ilike("guest_email", normalizedEmail)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "No se pudo consultar el pedido." }, { status: 500 });
    if (!order) return NextResponse.json({ error: "No encontramos un pedido con esos datos." }, { status: 404 });

    const { data: items, error: itemsError } = await database.from(tableNames.orderItems).select("product_name, price, quantity").eq("order_id", order.id);
    if (itemsError) return NextResponse.json({ error: "No se pudo cargar el detalle del pedido." }, { status: 500 });
    return NextResponse.json({ item: { ...order, items: items ?? [] } });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el pedido." }, { status: 500 });
  }
}