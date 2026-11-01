import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminDataClient } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

function requestCookies(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? [];
}

async function currentUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createServerClient(url, key, { cookies: { getAll: () => requestCookies(request), setAll: () => undefined } });
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const database = createAdminDataClient();
  if (!database) return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503 });
  const resource = new URL(request.url).searchParams.get("resource");

  if (resource === "profile") {
    return NextResponse.json({ email: user.email, fullName: user.user_metadata.full_name ?? "", phone: user.user_metadata.phone ?? "" });
  }
  if (resource === "orders") {
    const { data, error } = await database.from("orders").select("id, order_number, total, currency, order_status, payment_status, created_at").or(`user_id.eq.${user.id},guest_email.eq.${user.email ?? ""}`).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
    const orderIds = (data ?? []).map((order) => order.id);
    const [returns, refunds] = await Promise.all([
      orderIds.length ? database.from("returns").select("order_id, status").in("order_id", orderIds) : Promise.resolve({ data: [] }),
      orderIds.length ? database.from("refunds").select("order_id, refund_status").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    ]);
    const returnStatus = new Map((returns.data ?? []).map((item) => [item.order_id, item.status]));
    const refundStatus = new Map((refunds.data ?? []).map((item) => [item.order_id, item.refund_status]));
    return NextResponse.json({ items: (data ?? []).map((order) => ({ ...order, return_status: returnStatus.get(order.id) ?? null, refund_status: refundStatus.get(order.id) ?? null })) });
  }
  if (resource === "order") {
    const orderNumber = new URL(request.url).searchParams.get("orderNumber");
    if (!orderNumber) return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
    const { data, error } = await database.from("orders").select("id, order_number, total, currency, order_status, payment_status, shipping_address, tracking_number, shipping_carrier, shipped_at, created_at").or(`user_id.eq.${user.id},guest_email.eq.${user.email ?? ""}`).eq("order_number", orderNumber).maybeSingle();
    if (error) return NextResponse.json({ error: "No se pudo cargar el pedido." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    const [returns, refunds, items] = await Promise.all([
      database.from("returns").select("status").eq("order_id", data.id).order("created_at", { ascending: false }).limit(1),
      database.from("refunds").select("refund_status").eq("order_id", data.id).order("created_at", { ascending: false }).limit(1),
      database.from("order_items").select("product_name, price, quantity").eq("order_id", data.id),
    ]);
    return NextResponse.json({ item: { ...data, return_status: returns.data?.[0]?.status ?? null, refund_status: refunds.data?.[0]?.refund_status ?? null, items: items.data ?? [] } });
  }
  if (resource === "addresses") {
    const { data, error } = await database.from("addresses").select("id, state, city, postal_code, neighborhood, street, number, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "No se pudieron cargar las direcciones." }, { status: 500 });
    return NextResponse.json({ items: data });
  }
  if (resource === "favorites") {
    const { data, error } = await database.from("favorites").select("product_id").eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "No se pudieron cargar los favoritos." }, { status: 500 });
    return NextResponse.json({ items: (data ?? []).map((favorite) => favorite.product_id) });
  }
  return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
}

export async function PATCH(request: Request) {
  const limited = await rateLimit(request, "account-profile", 10, 60 * 60_000);
  if (limited) return limited;
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { fullName, phone } = await request.json() as { fullName?: string; phone?: string };
  const normalizedName = fullName?.trim() ?? "";
  const normalizedPhone = phone?.trim() ?? "";
  if (normalizedName.length > 120 || normalizedPhone.length > 40) {
    return NextResponse.json({ error: "El nombre o teléfono excede la longitud permitida." }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "La autenticación no está configurada." }, { status: 503 });
  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const supabase = createServerClient(url, key, { cookies: { getAll: () => requestCookies(request), setAll: (cookies) => cookies.forEach((cookie) => cookiesToSet.push(cookie)) } });
  const { error } = await supabase.auth.updateUser({ data: { full_name: normalizedName || null, phone: normalizedPhone || null } });
  if (error) return NextResponse.json({ error: "No se pudieron guardar los datos." }, { status: 500 });
  const response = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, "account-update", 20, 60 * 60_000);
  if (limited) return limited;
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json() as { state?: string; city?: string; postalCode?: string; neighborhood?: string; street?: string; number?: string; productSlug?: string };
  const resource = new URL(request.url).searchParams.get("resource");
  const database = createAdminDataClient();
  if (!database) return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503 });
  if (resource === "favorites") {
    const productSlug = body.productSlug?.trim() ?? "";
    if (!productSlug || productSlug.length > 160) return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
    const { data: product, error: productError } = await database.from("products").select("id").eq("slug", productSlug).maybeSingle();
    if (productError || !product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    const { data: existing, error: lookupError } = await database.from("favorites").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "No se pudo guardar el favorito." }, { status: 500 });
    if (!existing) {
      const { error } = await database.from("favorites").insert({ user_id: user.id, product_id: product.id });
      if (error) return NextResponse.json({ error: "No se pudo guardar el favorito." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  const address = {
    state: body.state?.trim() ?? "",
    city: body.city?.trim() ?? "",
    postalCode: body.postalCode?.trim() ?? "",
    neighborhood: body.neighborhood?.trim() ?? "",
    street: body.street?.trim() ?? "",
    number: body.number?.trim() ?? "",
  };
  if (!address.state || !address.city || !address.postalCode || !address.street || !address.number) return NextResponse.json({ error: "Completa los datos requeridos de la dirección." }, { status: 400 });
  if (Object.values(address).some((value) => value.length > 120)) return NextResponse.json({ error: "Los datos de dirección exceden la longitud permitida." }, { status: 400 });
  const { data, error } = await database.from("addresses").insert({ user_id: user.id, state: address.state, city: address.city, postal_code: address.postalCode, neighborhood: address.neighborhood || null, street: address.street, number: address.number }).select("id, state, city, postal_code, neighborhood, street, number, created_at").single();
  if (error) return NextResponse.json({ error: "No se pudo guardar la dirección." }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const limited = await rateLimit(request, "account-update", 20, 60 * 60_000);
  if (limited) return limited;
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (new URL(request.url).searchParams.get("resource") !== "favorites") return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  const { productSlug } = await request.json() as { productSlug?: string };
  if (!productSlug?.trim() || productSlug.trim().length > 160) return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
  const database = createAdminDataClient();
  if (!database) return NextResponse.json({ error: "La base de datos no está configurada." }, { status: 503 });
  const { data: product, error: productError } = await database.from("products").select("id").eq("slug", productSlug.trim()).maybeSingle();
  if (productError || !product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  const { error } = await database.from("favorites").delete().eq("user_id", user.id).eq("product_id", product.id);
  if (error) return NextResponse.json({ error: "No se pudo quitar el favorito." }, { status: 500 });
  return NextResponse.json({ ok: true });
}