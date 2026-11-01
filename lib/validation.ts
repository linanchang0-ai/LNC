export function getFriendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("paypal")) return "No pudimos completar tu pago. Por favor, inténtalo nuevamente o contacta con nosotros.";
  if (normalized.includes("duplicate")) return "Ya se está procesando esta compra. Revisa tu pedido o inténtalo en unos minutos.";
  if (normalized.includes("timeout")) return "La transacción tardó demasiado en responder. Inténtalo de nuevo.";
  if (normalized.includes("database") || normalized.includes("supabase")) return "No pudimos guardar tu pedido en este momento. Inténtalo más tarde.";

  return "No pudimos completar la solicitud en este momento. Te ayudamos por WhatsApp o por correo.";
}
