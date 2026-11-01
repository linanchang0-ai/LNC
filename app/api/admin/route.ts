import { NextResponse } from "next/server";
import { createAdminAuthClient, createAdminDataClient, getAdminRole, type AdminRole } from "@/lib/admin-auth";
import { sendContactReply, sendShippingNotification } from "@/lib/email";

function requestCookies(request: Request) {
  return () => request.headers.get("cookie")?.split(";").map((part) => {
    const [name, ...value] = part.trim().split("=");
    return { name, value: value.join("=") };
  }).filter((cookie) => cookie.name) ?? [];
}

async function authorizedClient(request: Request) {
  const auth = createAdminAuthClient(requestCookies(request));
  const { data } = auth ? await auth.auth.getUser() : { data: { user: null } };
  const role = await getAdminRole(data.user?.id);
  if (!role) return null;
  const supabase = createAdminDataClient();
  if (!supabase || !data.user?.email) return null;
  return { supabase, adminEmail: data.user.email, role };
}

function hasRole(role: AdminRole, allowedRoles: readonly AdminRole[]) {
  return allowedRoles.includes(role);
}

function recordAdminAction(supabase: NonNullable<ReturnType<typeof createAdminDataClient>>, adminEmail: string, action: string, resourceType: string, resourceId: string, details: Record<string, unknown> = {}) {
  return supabase.from("admin_audit_logs").insert({ admin_email: adminEmail, action, resource_type: resourceType, resource_id: resourceId, details }).then(() => undefined);
}

export async function GET(request: Request) {
  const authorized = await authorizedClient(request);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { supabase, role } = authorized;

  const resource = new URL(request.url).searchParams.get("resource");
  const resourceRoles: Record<string, readonly AdminRole[]> = {
    dashboard: ["admin", "operations", "finance"],
    products: ["admin", "operations"],
    orders: ["admin", "operations", "warehouse", "finance"],
    "order-report": ["admin", "operations", "warehouse", "finance"],
    returns: ["admin", "operations", "support", "warehouse"],
    refunds: ["admin", "finance"],
    audit: ["admin"],
    messages: ["admin", "operations", "support"],
    customers: ["admin", "operations", "support", "finance"],
    order: ["admin", "operations", "support", "warehouse", "finance"],
    categories: ["admin", "operations"],
    coupons: ["admin", "operations"],
  };
  if (!resource || !resourceRoles[resource] || !hasRole(role, resourceRoles[resource])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (resource === "dashboard") {
    const [orders, products, refunds] = await Promise.all([
      supabase.from("orders").select("order_number, customer_name, guest_email, total, order_status, payment_status, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id, name, stock, inventory_quantity, price, featured, is_published").order("created_at", { ascending: false }),
      supabase.from("refunds").select("refund_amount, refund_status"),
    ]);
    if (orders.error || products.error || refunds.error) return NextResponse.json({ error: "No se pudieron cargar los datos del panel." }, { status: 500 });
    return NextResponse.json({ orders: orders.data, products: products.data, refunds: refunds.data, customerCount: new Set((orders.data ?? []).map((order) => order.guest_email).filter(Boolean)).size });
  }

  if (resource === "order") {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });
    const { data: order, error: orderError } = await supabase.from("orders").select("id, order_number, customer_name, guest_email, phone, shipping_address, total, currency, order_status, payment_status, paypal_order_id, paypal_capture_id, tracking_number, shipping_carrier, shipped_at, created_at").eq("id", id).maybeSingle();
    if (orderError) return NextResponse.json({ error: "No se pudo cargar el pedido." }, { status: 500 });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    const [items, returns, refunds] = await Promise.all([
      supabase.from("order_items").select("id, product_name, price, quantity").eq("order_id", id),
      supabase.from("returns").select("id, reason, description, status, inspection_notes, restock_approved, created_at, restocked_at").eq("order_id", id).order("created_at", { ascending: false }),
      supabase.from("refunds").select("id, refund_amount, refund_status, refund_reason, refund_date, created_at").eq("order_id", id).order("created_at", { ascending: false }),
    ]);
    if (items.error || returns.error || refunds.error) return NextResponse.json({ error: "No se pudieron cargar los detalles del pedido." }, { status: 500 });
    return NextResponse.json({ item: { ...order, items: items.data ?? [], returns: returns.data ?? [], refunds: refunds.data ?? [] } });
  }

  if (resource === "order-report") {
    const { data, error } = await supabase.from("orders").select("order_number, customer_name, guest_email, phone, shipping_address, total, currency, order_status, payment_status, created_at, order_items(product_name, price, quantity)").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "No se pudo generar el reporte de pedidos." }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  if (resource === "products") {
    const fields = "id, name, category, price, stock, inventory_quantity, shipping_fee, short_description, description, materials, dimensions, colors, size_options, featured, is_published, image_url, color_images, color_prices, gallery, detail_images, created_at";
    const fallbackFields = [
      fields.replace(", color_prices", ""),
      fields.replace(", size_options", ""),
      fields.replace(", size_options", "").replace(", color_prices", ""),
    ];
    const initialResult = await supabase.from("products").select(fields).order("created_at", { ascending: false });
    let data: unknown = initialResult.data;
    let error = initialResult.error;
    for (const fallbackQuery of fallbackFields) {
      if (error?.code !== "42703") break;
      const fallbackResult = await supabase.from("products").select(fallbackQuery).order("created_at", { ascending: false });
      data = fallbackResult.data;
      error = fallbackResult.error;
    }
    if (error) return NextResponse.json({ error: "No se pudieron cargar los datos." }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  const queries = {
    categories: () => supabase.from("categories").select("id, slug, name").order("name"),
    orders: () => supabase.from("orders").select("id, order_number, customer_name, guest_email, phone, shipping_address, total, order_status, payment_status, paypal_capture_id, tracking_number, shipping_carrier, shipped_at, created_at").order("created_at", { ascending: false }),
    returns: () => supabase.from("returns").select("id, order_id, reason, status, inspection_notes, restock_approved, created_at, orders(customer_name, guest_email, order_number)").order("created_at", { ascending: false }),
    refunds: () => supabase.from("refunds").select("id, order_id, refund_amount, refund_status, refund_reason, created_at, orders(customer_name, guest_email, order_number)").order("created_at", { ascending: false }),
    audit: () => supabase.from("admin_audit_logs").select("id, admin_email, action, resource_type, resource_id, details, created_at").order("created_at", { ascending: false }).limit(200),
    messages: () => supabase.from("contact_messages").select("id, name, email, message, status, reply, replied_at, replied_by, created_at, resolved_at").order("created_at", { ascending: false }).limit(200),
    coupons: () => supabase.from("promo_codes").select("id, code, discount_type, discount_value, minimum_subtotal, starts_at, expires_at, max_uses, uses_count, is_active, created_at").order("created_at", { ascending: false }),
  } as const;

  if (resource === "customers") {
    const { data, error } = await supabase.from("orders").select("guest_email, customer_name, total, shipping_address, payment_status").eq("payment_status", "Pagado").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "No se pudieron cargar los clientes." }, { status: 500 });
    const customers = Object.values((data ?? []).reduce<Record<string, { email: string; name: string; city: string; orders: number; totalSpent: number }>>((result, order) => {
      const email = order.guest_email ?? "Sin correo";
      const current = result[email] ?? { email, name: order.customer_name ?? "Cliente", city: (order.shipping_address as { city?: string } | null)?.city ?? "-", orders: 0, totalSpent: 0 };
      current.orders += 1;
      current.totalSpent += Number(order.total ?? 0);
      result[email] = current;
      return result;
    }, {}));
    return NextResponse.json({ items: customers });
  }

  if (!resource || !(resource in queries)) return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  const { data, error } = await queries[resource as keyof typeof queries]();
  if (error) return NextResponse.json({ error: "No se pudieron cargar los datos." }, { status: 500 });
  return NextResponse.json({ items: data });
}

function productSlug(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

function stockLabel(quantity: number) {
  if (quantity === 0) return "Agotado";
  if (quantity <= 5) return "Pocas unidades";
  return "En stock";
}

export async function POST(request: Request) {
  const authorized = await authorizedClient(request);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { supabase, adminEmail, role } = authorized;
  let body: { name?: string; category?: string; price?: number; shippingFee?: number; inventoryQuantity?: number; shortDescription?: string; description?: string; materials?: string[]; dimensions?: string; colors?: string[]; sizes?: string[]; primaryImage?: string; colorImages?: Record<string, string>; colorPrices?: Record<string, number>; gallery?: string[]; detailImages?: string[]; resource?: string; code?: string; discountType?: "percentage" | "fixed"; discountValue?: number; minimumSubtotal?: number; expiresAt?: string; maxUses?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
  const { name, category, price, shippingFee, inventoryQuantity, shortDescription, description, materials, dimensions, colors, sizes, primaryImage, colorImages, colorPrices, gallery, detailImages, resource, code, discountType, discountValue, minimumSubtotal, expiresAt, maxUses } = body;
  if (resource === "categories") {
    if (!hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const categoryName = name?.trim() ?? "";
    const slug = productSlug(categoryName);
    if (!categoryName || !slug) return NextResponse.json({ error: "Indica un nombre de categoría válido." }, { status: 400 });
    const { data, error } = await supabase.from("categories").insert({ name: categoryName, slug }).select("id, slug, name").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Ya existe esta categoría." : "No se pudo crear la categoría." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "created", "category", data.id, { name: data.name, slug: data.slug });
    return NextResponse.json({ item: data }, { status: 201 });
  }
  if (resource === "coupons") {
    if (!hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const couponCode = code?.trim().toUpperCase() ?? "";
    const value = Number(discountValue);
    const minimum = Number(minimumSubtotal ?? 0);
    const limit = maxUses === null || maxUses === undefined || maxUses === 0 ? null : Number(maxUses);
    if (!/^[A-Z0-9_-]{3,40}$/.test(couponCode) || !["percentage", "fixed"].includes(discountType ?? "") || !Number.isFinite(value) || value <= 0 || (discountType === "percentage" && value > 100) || !Number.isFinite(minimum) || minimum < 0 || (limit !== null && (!Number.isInteger(limit) || limit < 1))) return NextResponse.json({ error: "Los datos del cupón no son válidos." }, { status: 400 });
    const expiration = expiresAt?.trim() ? new Date(expiresAt).toISOString() : null;
    if (expiration && Number.isNaN(new Date(expiration).getTime())) return NextResponse.json({ error: "La fecha de vencimiento no es válida." }, { status: 400 });
    const { data, error } = await supabase.from("promo_codes").insert({ code: couponCode, discount_type: discountType, discount_value: Math.round(value * 100) / 100, minimum_subtotal: Math.round(minimum * 100) / 100, expires_at: expiration, max_uses: limit }).select("id, code, discount_type, discount_value, minimum_subtotal, starts_at, expires_at, max_uses, uses_count, is_active, created_at").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Este código ya existe." : "No se pudo crear el cupón." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "created", "coupon", data.id, { code: data.code });
    return NextResponse.json({ item: data }, { status: 201 });
  }
  const cleanName = name?.trim() ?? "";
  const cleanCategory = category?.trim() ?? "";
  const productPrice = Number(price);
  const productShippingFee = Number(shippingFee ?? 0);
  const quantity = Number(inventoryQuantity);
  if (!cleanName || !cleanCategory) return NextResponse.json({ error: "Indica un nombre y una categoría válidos." }, { status: 400 });
  if (!hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { data: selectedCategory } = await supabase.from("categories").select("id").eq("slug", cleanCategory).maybeSingle();
  if (!selectedCategory) return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
  if (!Number.isFinite(productPrice) || productPrice <= 0) return NextResponse.json({ error: "El precio debe ser mayor a cero." }, { status: 400 });
  if (!Number.isFinite(productShippingFee) || productShippingFee < 0) return NextResponse.json({ error: "El costo de envío no puede ser negativo." }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 0) return NextResponse.json({ error: "El inventario debe ser un número entero igual o mayor a cero." }, { status: 400 });
  if (sizes !== undefined && (!Array.isArray(sizes) || sizes.some((size) => typeof size !== "string" || !size.trim() || size.trim().length > 30))) return NextResponse.json({ error: "Las tallas no son válidas." }, { status: 400 });
  const sizeOptions = [...new Set((sizes ?? []).map((size) => size.trim()))];
  const slug = productSlug(cleanName);
  if (!slug) return NextResponse.json({ error: "El nombre no permite generar un enlace válido." }, { status: 400 });
  const content = {
    short_description: shortDescription?.trim() || "",
    description: description?.trim() || "",
    materials: Array.isArray(materials) ? materials.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [],
    dimensions: dimensions?.trim() || "",
    colors: Array.isArray(colors) ? colors.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [],
    size_options: sizeOptions,
    gallery: Array.isArray(gallery) ? gallery : [],
    detail_images: Array.isArray(detailImages) ? detailImages : [],
    color_images: colorImages ?? {},
    ...(colorPrices === undefined ? {} : { color_prices: colorPrices }),
  };
  const configuredColorPrices = content.color_prices ?? {};
  if ((primaryImage !== undefined && primaryImage !== "" && !primaryImage.startsWith("https://")) || content.gallery.some((image) => !image.startsWith("https://")) || content.detail_images.some((image) => !image.startsWith("https://")) || Object.values(content.color_images).some((image) => typeof image !== "string" || !image.startsWith("https://")) || Object.entries(configuredColorPrices).some(([color, value]) => !color.trim() || typeof value !== "number" || !Number.isFinite(value) || value <= 0)) return NextResponse.json({ error: "Los datos del producto no son válidos." }, { status: 400 });
  const { data, error } = await supabase.from("products").insert({
    slug,
    name: cleanName,
    category: cleanCategory,
    price: Math.round(productPrice * 100) / 100,
    shipping_fee: Math.round(productShippingFee * 100) / 100,
    stock: stockLabel(quantity),
    inventory_quantity: quantity,
    ...content,
    image_url: primaryImage ?? "",
    is_published: false,
  }).select("id, name, category, price, stock, inventory_quantity, shipping_fee, short_description, description, materials, dimensions, colors, size_options, featured, is_published, image_url, color_images, color_prices, gallery, detail_images").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Ya existe un producto con ese nombre." : "No se pudo crear el producto." }, { status: 500 });
  void recordAdminAction(supabase, adminEmail, "created", "product", data.id, { name: data.name, isPublished: data.is_published });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorized = await authorizedClient(request);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { supabase, adminEmail, role } = authorized;
  let body: { id?: string; featured?: boolean; isPublished?: boolean; name?: string; category?: string; price?: number; shippingFee?: number; inventoryQuantity?: number; shortDescription?: string; description?: string; materials?: string[]; dimensions?: string; colors?: string[]; sizes?: string[]; primaryImage?: string; colorImages?: Record<string, string>; colorPrices?: Record<string, number>; gallery?: string[]; detailImages?: string[]; resource?: string; status?: string; trackingNumber?: string; shippingCarrier?: string; restockApproved?: boolean; inspectionNotes?: string; reply?: string; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }
  const { id, featured, isPublished, name, category, price, shippingFee, inventoryQuantity, shortDescription, description, materials, dimensions, colors, sizes, primaryImage, colorImages, colorPrices, gallery, detailImages, resource, status, trackingNumber, shippingCarrier, restockApproved, inspectionNotes, reply, isActive } = body;
  if (resource === "coupons") {
    if (!id || !hasRole(role, ["admin", "operations"]) || typeof isActive !== "boolean") return NextResponse.json({ error: "Cupón no válido." }, { status: 400 });
    const { data, error } = await supabase.from("promo_codes").update({ is_active: isActive }).eq("id", id).select("id, code, discount_type, discount_value, minimum_subtotal, starts_at, expires_at, max_uses, uses_count, is_active, created_at").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar el cupón." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "updated", "coupon", id, { isActive });
    return NextResponse.json({ item: data });
  }
  if (resource === "returns") {
    if (!hasRole(role, ["admin", "operations", "support", "warehouse"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const allowedStatuses = ["Solicitud de devolución", "En revisión", "Aprobada", "Rechazada", "Recibida", "Cerrada"];
    if (!id || !status || !allowedStatuses.includes(status)) return NextResponse.json({ error: "Estado de devolución inválido." }, { status: 400 });
    if (status === "Recibida") {
      const { data, error } = await supabase.rpc("receive_return", { p_return_id: id, p_inspection_notes: inspectionNotes?.trim() || "", p_restock_approved: restockApproved === true });
      const item = data?.[0];
      if (error || !item) return NextResponse.json({ error: error?.message ?? "No se pudo recibir la devolución." }, { status: 500 });
      void recordAdminAction(supabase, adminEmail, "received", "return", id, { restockApproved: restockApproved === true });
      return NextResponse.json({ item, restocked: restockApproved === true });
    }
    const { data, error } = await supabase.from("returns").update({ status }).eq("id", id).select("id, status, inspection_notes, restock_approved, restocked_at").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar la devolución." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "updated", "return", id, { status });
    return NextResponse.json({ item: data });
  }
  if (resource === "messages") {
    if (!hasRole(role, ["admin", "operations", "support"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const allowedStatuses = ["Nuevo", "En proceso", "Resuelto"];
    if (!id || !status || !allowedStatuses.includes(status)) return NextResponse.json({ error: "Estado de mensaje inválido." }, { status: 400 });
    const replyText = reply?.trim() || null;
    const { data, error } = await supabase.from("contact_messages").update({ status, resolved_at: status === "Resuelto" ? new Date().toISOString() : null, ...(replyText ? { reply: replyText, replied_at: new Date().toISOString(), replied_by: adminEmail } : {}) }).eq("id", id).select("id, name, email, status, resolved_at, reply, replied_at, replied_by").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar el mensaje." }, { status: 500 });
    if (replyText) void sendContactReply({ email: data.email, customerName: data.name, message: replyText });
    void recordAdminAction(supabase, adminEmail, replyText ? "replied" : "updated", "contact_message", id, { status });
    return NextResponse.json({ item: data });
  }
  if (resource === "orders") {
    if (!hasRole(role, ["admin", "operations", "warehouse"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const allowedStatuses = ["Pendiente", "Procesando", "Enviado", "Entregado", "Cancelado"];
    if (!id || !status || !allowedStatuses.includes(status)) return NextResponse.json({ error: "Estado de pedido inválido." }, { status: 400 });
    const tracking = trackingNumber?.trim() ?? "";
    const carrier = shippingCarrier?.trim() ?? "";
    if (status === "Enviado" && (!tracking || !carrier)) return NextResponse.json({ error: "Indica paquetería y número de guía antes de enviar." }, { status: 400 });
    const { data, error } = await supabase.from("orders").update({
      order_status: status,
      tracking_number: tracking || null,
      shipping_carrier: carrier || null,
      shipped_at: status === "Enviado" ? new Date().toISOString() : null,
    }).eq("id", id).select("id, order_number, guest_email, customer_name, order_status, tracking_number, shipping_carrier, shipped_at, shipping_email_sent_at").single();
    if (error) return NextResponse.json({ error: "No se pudo actualizar el envío." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "updated", "order", id, { status, trackingNumber: tracking || null, shippingCarrier: carrier || null });
    if (status === "Enviado" && !data.shipping_email_sent_at && data.guest_email && data.shipping_carrier && data.tracking_number) {
      void sendShippingNotification({ email: data.guest_email, customerName: data.customer_name, orderNumber: data.order_number, shippingCarrier: data.shipping_carrier, trackingNumber: data.tracking_number })
        .then((sent) => sent ? supabase.from("orders").update({ shipping_email_sent_at: new Date().toISOString() }).eq("id", id).is("shipping_email_sent_at", null) : null)
        .catch(() => undefined);
    }
    return NextResponse.json({ item: data });
  }
  if (!id) return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  if (!hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const update: { featured?: boolean; is_published?: boolean; name?: string; category?: string; price?: number; shipping_fee?: number; stock?: string; inventory_quantity?: number; image_url?: string; color_images?: Record<string, string>; color_prices?: Record<string, number>; gallery?: string[]; detail_images?: string[]; short_description?: string; description?: string; materials?: string[]; dimensions?: string; colors?: string[]; size_options?: string[] } = {};
  if (typeof featured === "boolean") update.featured = featured;
  if (typeof isPublished === "boolean") update.is_published = isPublished;
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    update.name = name.trim();
  }
  if (category !== undefined) {
    const categorySlug = category.trim();
    const { data: selectedCategory } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
    if (!selectedCategory) return NextResponse.json({ error: "La categoría no es válida." }, { status: 400 });
    update.category = categorySlug;
  }
  if (price !== undefined) {
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "El precio debe ser mayor a cero." }, { status: 400 });
    update.price = Math.round(price * 100) / 100;
  }
  if (shippingFee !== undefined) {
    if (!Number.isFinite(shippingFee) || shippingFee < 0) return NextResponse.json({ error: "El costo de envío no puede ser negativo." }, { status: 400 });
    update.shipping_fee = Math.round(shippingFee * 100) / 100;
  }
  if (inventoryQuantity !== undefined) {
    if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) return NextResponse.json({ error: "El inventario debe ser un número entero igual o mayor a cero." }, { status: 400 });
    update.inventory_quantity = inventoryQuantity;
    update.stock = stockLabel(inventoryQuantity);
  }
  if (gallery !== undefined) {
    if (!Array.isArray(gallery) || gallery.some((image) => typeof image !== "string" || !image.startsWith("https://"))) {
      return NextResponse.json({ error: "Las imágenes del producto no son válidas." }, { status: 400 });
    }
    update.gallery = gallery;
  }
  if (detailImages !== undefined) {
    if (!Array.isArray(detailImages) || detailImages.some((image) => typeof image !== "string" || !image.startsWith("https://"))) {
      return NextResponse.json({ error: "Las imágenes de detalle no son válidas." }, { status: 400 });
    }
    update.detail_images = detailImages;
  }
  if (primaryImage !== undefined) {
    if (primaryImage !== "" && !primaryImage.startsWith("https://")) return NextResponse.json({ error: "La imagen principal no es válida." }, { status: 400 });
    update.image_url = primaryImage;
  }
  if (colorImages !== undefined) {
    if (!colorImages || typeof colorImages !== "object" || Array.isArray(colorImages) || Object.entries(colorImages).some(([color, image]) => !color.trim() || typeof image !== "string" || !image.startsWith("https://"))) return NextResponse.json({ error: "Las imágenes por color no son válidas." }, { status: 400 });
    update.color_images = colorImages;
  }
  if (colorPrices !== undefined) {
    if (!colorPrices || typeof colorPrices !== "object" || Array.isArray(colorPrices) || Object.entries(colorPrices).some(([color, value]) => !color.trim() || typeof value !== "number" || !Number.isFinite(value) || value <= 0)) return NextResponse.json({ error: "Los precios por color no son válidos." }, { status: 400 });
    update.color_prices = colorPrices;
  }
  if (shortDescription !== undefined) update.short_description = shortDescription.trim();
  if (description !== undefined) update.description = description.trim();
  if (dimensions !== undefined) update.dimensions = dimensions.trim();
  if (materials !== undefined) {
    if (!Array.isArray(materials) || materials.some((item) => typeof item !== "string")) return NextResponse.json({ error: "Los materiales no son válidos." }, { status: 400 });
    update.materials = materials.map((item) => item.trim()).filter(Boolean);
  }
  if (colors !== undefined) {
    if (!Array.isArray(colors) || colors.some((item) => typeof item !== "string")) return NextResponse.json({ error: "Los colores no son válidos." }, { status: 400 });
    update.colors = colors.map((item) => item.trim()).filter(Boolean);
  }
  if (sizes !== undefined) {
    if (!Array.isArray(sizes) || sizes.some((size) => typeof size !== "string" || !size.trim() || size.trim().length > 30)) return NextResponse.json({ error: "Las tallas no son válidas." }, { status: 400 });
    update.size_options = [...new Set(sizes.map((size) => size.trim()))];
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  const { data, error } = await supabase.from("products").update(update).eq("id", id).select("id, name, category, price, stock, inventory_quantity, shipping_fee, short_description, description, materials, dimensions, colors, size_options, featured, is_published, image_url, color_images, color_prices, gallery, detail_images").single();
  if (error) return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  void recordAdminAction(supabase, adminEmail, "updated", "product", id, update);
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const authorized = await authorizedClient(request);
  if (!authorized) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { supabase, adminEmail, role } = authorized;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const resource = url.searchParams.get("resource");
  if (resource === "coupons") {
    if (!id || !hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "Cupón no válido." }, { status: 400 });
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo eliminar el cupón." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "deleted", "coupon", id);
    return NextResponse.json({ ok: true });
  }
  if (resource === "categories") {
    if (!id || !hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "Categoría no válida." }, { status: 400 });
    const { data: category, error: categoryError } = await supabase.from("categories").select("id, slug, name").eq("id", id).maybeSingle();
    if (categoryError || !category) return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 });
    const { count, error: usageError } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category", category.slug);
    if (usageError) return NextResponse.json({ error: "No se pudo comprobar el uso de la categoría." }, { status: 500 });
    if (count) return NextResponse.json({ error: "Esta categoría tiene productos asignados. Reasígnalos antes de eliminarla." }, { status: 409 });
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo eliminar la categoría." }, { status: 500 });
    void recordAdminAction(supabase, adminEmail, "deleted", "category", id, { name: category.name, slug: category.slug });
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  if (!hasRole(role, ["admin", "operations"])) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { count, error: lookupError } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (lookupError) return NextResponse.json({ error: "No se pudo comprobar el historial de pedidos." }, { status: 500 });
  if (count) return NextResponse.json({ error: "Este producto ya tiene pedidos y debe permanecer como borrador." }, { status: 409 });
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  void recordAdminAction(supabase, adminEmail, "deleted", "product", id);
  return NextResponse.json({ ok: true });
}