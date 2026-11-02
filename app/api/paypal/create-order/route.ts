import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createPayPalOrder } from "@/lib/paypal-client";
import { getCatalogProducts } from "@/lib/catalog";
import { getSupabaseServerClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { getShippingCost } from "@/lib/shipping";

type RequestedItem = {
  id: string | number;
  color?: string;
  size?: string;
  quantity?: number;
};

function isRequestedItem(value: unknown): value is RequestedItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const validId = (typeof item.id === "string" && item.id.trim().length > 0 && item.id.length <= 128)
    || (typeof item.id === "number" && Number.isSafeInteger(item.id) && item.id > 0);
  return validId
    && (item.color === undefined || (typeof item.color === "string" && item.color.length <= 120))
    && (item.size === undefined || (typeof item.size === "string" && item.size.length <= 120))
    && (item.quantity === undefined || (typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20));
}

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
  const auth = createServerClient(url, key, { cookies: { getAll: () => requestCookies(request), setAll: () => undefined } });
  const { data } = await auth.auth.getUser();
  return data.user;
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, "paypal-create-order", 10, 60_000);
  if (limited) return limited;
  try {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
    }
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
    }
    const body = parsedBody as Record<string, unknown>;
    if (body.currency !== "MXN") return NextResponse.json({ error: "La moneda del pedido no es válida." }, { status: 400 });
    const currency = body.currency;
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!/^ts-[A-Za-z0-9-]{1,70}$/.test(orderId)) return NextResponse.json({ error: "La referencia del pedido no es válida." }, { status: 400 });

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: "El pedido debe contener productos válidos." }, { status: 400 });
    }
    const validItems = items.filter(isRequestedItem);
    if (validItems.length !== items.length) return NextResponse.json({ error: "El pedido debe contener productos válidos." }, { status: 400 });

    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phoneDigits = phone.replace(/\D/g, "").length;
    if (customerName.length < 2 || customerName.length > 160
      || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || phone.length > 40 || !/^[+()\d\s.-]+$/.test(phone) || phoneDigits < 7 || phoneDigits > 15) {
      return NextResponse.json({ error: "Completa un nombre, correo electrónico y teléfono válidos." }, { status: 400 });
    }

    const addressValue = body.shippingAddress;
    if (!addressValue || typeof addressValue !== "object" || Array.isArray(addressValue)) {
      return NextResponse.json({ error: "Completa una dirección de envío válida." }, { status: 400 });
    }
    const addressInput = addressValue as Record<string, unknown>;
    const addressLimits: Record<string, [number, number]> = {
      state: [2, 100],
      city: [2, 100],
      postalCode: [3, 20],
      neighborhood: [2, 120],
      street: [2, 160],
      number: [1, 30],
    };
    const shippingAddress: Record<string, string> = {};
    for (const [field, [minimum, maximum]] of Object.entries(addressLimits)) {
      const value = addressInput[field];
      if (typeof value !== "string" || value.trim().length < minimum || value.trim().length > maximum) {
        return NextResponse.json({ error: "Completa una dirección de envío válida." }, { status: 400 });
      }
      shippingAddress[field] = value.trim();
    }

    if (body.couponCode !== undefined && body.couponCode !== null
      && (typeof body.couponCode !== "string" || body.couponCode.trim().length > 64)) {
      return NextResponse.json({ error: "El código del cupón no es válido." }, { status: 400 });
    }
    const requestedCouponCode = typeof body.couponCode === "string" ? body.couponCode.trim() : "";

    const products = await getCatalogProducts();
    const requestedItems = validItems.map((item) => {
      const product = products.find((entry) => entry.databaseId === String(item.id) || entry.id === item.id);
      const color = item.color?.trim() || undefined;
      const size = item.size?.trim() || undefined;
      return { product, color, size, price: product?.colorPrices?.[color ?? ""] ?? product?.price ?? 0, quantity: item.quantity ?? 1 };
    });
    if (requestedItems.some((item) => !item.product
      || (item.color && !item.product.colors.includes(item.color))
      || (item.product.sizes?.length ? !item.size || !item.product.sizes.includes(item.size) : Boolean(item.size)))) {
      return NextResponse.json({ error: "Uno o más productos ya no están disponibles." }, { status: 400 });
    }
    if (requestedItems.some((item) => !item.product?.databaseId)) {
      return NextResponse.json({ error: "El catálogo de producción no está disponible para aceptar pedidos." }, { status: 503 });
    }
    const subtotal = requestedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = getShippingCost(subtotal);
    const database = getSupabaseServerClient();
    if (!database) return NextResponse.json({ error: "No se pudo conectar con la base de datos para iniciar el pedido." }, { status: 503 });
    let couponCode: string | null = null;
    let discount = 0;
    if (requestedCouponCode) {
      couponCode = requestedCouponCode.toUpperCase();
      const { data: coupon, error: couponError } = await database.from("promo_codes").select("discount_type, discount_value, minimum_subtotal, starts_at, expires_at, max_uses, uses_count, is_active").eq("code", couponCode).maybeSingle();
      if (couponError) return NextResponse.json({ error: "No se pudo validar el cupón." }, { status: 503 });
      const now = Date.now();
      const unavailable = !coupon || !coupon.is_active || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) || (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) || subtotal < Number(coupon.minimum_subtotal);
      if (unavailable) return NextResponse.json({ error: "El cupón ya no es válido para este pedido." }, { status: 400 });
      const rawDiscount = coupon.discount_type === "percentage" ? subtotal * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
      discount = Math.min(subtotal, Math.round(rawDiscount * 100) / 100);
    }
    const amount = subtotal + shipping - discount;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "El monto del pedido no es válido." }, { status: 400 });
    }

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "PayPal no está configurado. Agrega PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET." },
        { status: 503 },
      );
    }

    const result = await createPayPalOrder({ amount, currency, orderId });
    const approvalUrl = result.links?.find((item: { rel: string; href: string }) => item.rel === "approve")?.href;
    const paypalOrderId = result.id;

    if (!paypalOrderId) {
      return NextResponse.json({ error: "No se pudo iniciar la orden de pago." }, { status: 400 });
    }

    const reservationItems = requestedItems.map(({ product, quantity }) => ({ productId: product?.databaseId, quantity }));
    const { data: reserved, error: reservationError } = await database.rpc("reserve_product_inventory", {
      p_paypal_order_id: paypalOrderId,
      p_items: reservationItems,
    });
    if (reservationError || !reserved) {
      return NextResponse.json({ error: "No hay existencias suficientes para completar este pedido." }, { status: 409 });
    }

    const user = await currentUser(request);
    const { error: draftError } = await database.from("checkout_drafts").insert({
      paypal_order_id: paypalOrderId,
      order_number: orderId,
      user_id: user?.id ?? null,
      guest_email: email,
      customer_name: customerName,
      phone,
      shipping_address: shippingAddress,
      items: requestedItems.map(({ product, color, size, price, quantity }) => ({
        productId: product?.databaseId ?? null,
        productName: `${product?.name ?? "Producto"}${color || size ? ` (${[color, size].filter(Boolean).join(" / ")})` : ""}`,
        color,
        size,
        price,
        quantity,
      })),
      subtotal,
      shipping,
      coupon_code: couponCode,
      discount,
      total: amount,
      currency,
    });
    if (draftError) {
      await database.rpc("release_product_inventory", { p_paypal_order_id: paypalOrderId });
      return NextResponse.json({ error: "No se pudo guardar el pedido antes del pago." }, { status: 503 });
    }

    return NextResponse.json({ id: paypalOrderId, approvalUrl, orderId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No pudimos completar tu pago." },
      { status: 500 },
    );
  }
}
