type CaptureResponse = {
  orderNumber?: string;
  error?: string;
};

export async function confirmPayPalOrderCapture(orderId: string) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw new Error("No pudimos verificar el pago. No vuelvas a pagar; actualiza esta página o contacta con soporte.");
    }

    if (response.ok || response.status < 500 || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  if (!response) throw new Error("No pudimos verificar el pago. No vuelvas a pagar; contacta con soporte.");
  const data = await response.json().catch(() => ({})) as CaptureResponse;
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo confirmar el pago. No vuelvas a pagar; contacta con soporte.");
  }
  if (!data.orderNumber) {
    throw new Error("El pago se confirmó, pero no se recibió el número del pedido. No vuelvas a pagar; contacta con soporte.");
  }
  return data.orderNumber;
}
