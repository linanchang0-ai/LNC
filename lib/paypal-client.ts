export async function createPayPalOrder({ amount, currency = "MXN", orderId }: { amount: number; currency?: string; orderId: string }) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const environment = process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing");
  }
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required to create a PayPal order");
  }

  const tokenResponse = await fetch(
    environment === "production" ? "https://api.paypal.com/v1/oauth2/token" : "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
  );

  if (!tokenResponse.ok) {
    throw new Error("Unable to fetch PayPal access token");
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const orderResponse = await fetch(
    environment === "production" ? "https://api.paypal.com/v2/checkout/orders" : "https://api-m.sandbox.paypal.com/v2/checkout/orders",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "LNC SPORTS",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${siteUrl}/checkout?status=success`,
          cancel_url: `${siteUrl}/checkout?status=cancelled`,
        },
      }),
    },
  );

  if (!orderResponse.ok) {
    const text = await orderResponse.text();
    throw new Error(`PayPal order creation failed: ${text}`);
  }

  return orderResponse.json();
}

export async function capturePayPalOrder(orderId: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing");
  }

  const tokenResponse = await fetch(
    environment === "production" ? "https://api.paypal.com/v1/oauth2/token" : "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
  );

  if (!tokenResponse.ok) {
    throw new Error("Unable to fetch PayPal access token");
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const captureResponse = await fetch(
    `${environment === "production" ? "https://api.paypal.com" : "https://api-m.sandbox.paypal.com"}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!captureResponse.ok) {
    const text = await captureResponse.text();
    throw new Error(`PayPal capture failed: ${text}`);
  }

  return captureResponse.json();
}

export async function getPayPalOrder(orderId: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === "production" ? "https://api.paypal.com" : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are missing");
  }

  const tokenResponse = await fetch(`${environment}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenResponse.ok) throw new Error("Unable to fetch PayPal access token");

  const tokenData = await tokenResponse.json() as { access_token: string };
  const orderResponse = await fetch(`${environment}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: "no-store",
  });
  if (!orderResponse.ok) throw new Error(`PayPal order lookup failed: ${await orderResponse.text()}`);

  return orderResponse.json();
}

export async function refundPayPalCapture(captureId: string, amount?: number, requestId?: string) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT === "production" ? "https://api.paypal.com" : "https://api-m.sandbox.paypal.com";
  if (!clientId || !clientSecret) throw new Error("PayPal credentials are missing");

  const tokenResponse = await fetch(`${environment}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!tokenResponse.ok) throw new Error("Unable to fetch PayPal access token");
  const { access_token } = await tokenResponse.json() as { access_token: string };

  const response = await fetch(`${environment}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    body: amount ? JSON.stringify({ amount: { currency_code: "MXN", value: amount.toFixed(2) } }) : undefined,
  });
  if (!response.ok) throw new Error(`PayPal refund failed: ${await response.text()}`);
  return response.json() as Promise<{ id?: string; status?: string; amount?: { value?: string } }>;
}

export async function verifyPayPalWebhook(event: unknown, headers: Headers) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const baseUrl = process.env.PAYPAL_ENVIRONMENT === "production" ? "https://api.paypal.com" : "https://api-m.sandbox.paypal.com";
  if (!clientId || !clientSecret || !webhookId) throw new Error("PayPal webhook credentials are missing");

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!tokenResponse.ok) throw new Error("Unable to fetch PayPal access token");
  const { access_token } = await tokenResponse.json() as { access_token: string };

  const verificationResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!verificationResponse.ok) throw new Error("PayPal webhook signature verification failed");
  const { verification_status } = await verificationResponse.json() as { verification_status?: string };
  return verification_status === "SUCCESS";
}
