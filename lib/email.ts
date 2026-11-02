type OrderEmail = {
  email: string | null;
  customerName: string | null;
  orderNumber: string;
  total?: number | null;
  currency?: string | null;
};

function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!emailEnabled()) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html }),
  });
  return response.ok;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export async function sendOrderConfirmation(order: OrderEmail) {
  if (!order.email) return false;
  const name = order.customerName || "cliente";
  const total = new Intl.NumberFormat("es-MX", { style: "currency", currency: order.currency || "MXN" }).format(Number(order.total ?? 0));
  return sendEmail(order.email, `Confirmación de pedido ${order.orderNumber}`, `<p>Hola ${name},</p><p>Recibimos tu pago y estamos preparando tu pedido <strong>${order.orderNumber}</strong>.</p><p>Total: <strong>${total}</strong></p><p>Te avisaremos cuando sea enviado.</p>`);
}

export async function sendNewOrderNotification(order: Omit<OrderEmail, "email"> & { email: string | null }) {
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!recipient) return false;
  const customerName = escapeHtml(order.customerName || "Cliente");
  const customerEmail = escapeHtml(order.email || "No disponible");
  const orderNumber = escapeHtml(order.orderNumber);
  const total = new Intl.NumberFormat("es-MX", { style: "currency", currency: order.currency || "MXN" }).format(Number(order.total ?? 0));
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://linanchang.com"}/admin/orders`;
  return sendEmail(recipient, `Nuevo pedido ${order.orderNumber} - LNC SPORTS`, `<p>Se recibió un nuevo pedido pagado.</p><p>Pedido: <strong>${orderNumber}</strong></p><p>Cliente: ${customerName}</p><p>Correo del cliente: ${customerEmail}</p><p>Total: <strong>${escapeHtml(total)}</strong></p><p><a href="${escapeHtml(orderUrl)}">Abrir administración de pedidos</a></p>`);
}

export async function sendShippingNotification(order: OrderEmail & { shippingCarrier: string; trackingNumber: string }) {
  if (!order.email) return false;
  const name = order.customerName || "cliente";
  return sendEmail(order.email, `Tu pedido ${order.orderNumber} fue enviado`, `<p>Hola ${name},</p><p>Tu pedido <strong>${order.orderNumber}</strong> ya fue enviado.</p><p>Paquetería: <strong>${order.shippingCarrier}</strong><br>Guía: <strong>${order.trackingNumber}</strong></p>`);
}

export async function sendContactReply({ email, customerName, message }: { email: string; customerName: string; message: string }) {
  return sendEmail(email, "Respuesta de LNC SPORTS", `<p>Hola ${escapeHtml(customerName)},</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><p>Equipo LNC SPORTS</p>`);
}