const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYPAL_CLIENT_ID",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_ENVIRONMENT",
  "PAYPAL_WEBHOOK_ID",
  "EMAIL_FROM",
] as const;

export function getEnvValue(key: (typeof required)[number]) {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  return value;
}

export function assertRequiredEnv() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
    };
  }

  return { ok: true, missing: [] as string[] };
}
