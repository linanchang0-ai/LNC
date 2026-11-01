export type PayPalEnvironment = "sandbox" | "production";

export function getPayPalEnvironment(): PayPalEnvironment {
  return (process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox") as PayPalEnvironment;
}

export function isPayPalReady() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID,
  );
}

export function getPayPalApiBaseUrl() {
  return getPayPalEnvironment() === "production"
    ? "https://api.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
