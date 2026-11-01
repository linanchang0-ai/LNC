import { NextResponse } from "next/server";
import { assertRequiredEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const environment = assertRequiredEnv();
  const supabase = getSupabaseServerClient();
  let databaseReady = false;
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const globalRateLimitConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const errorMonitoringConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  if (supabase) {
    const { error } = await supabase.from("products").select("id").limit(1);
    databaseReady = !error;
  }

  const ok = environment.ok && databaseReady;
  return NextResponse.json({
    ok,
    app: "LNC SPORTS",
    status: ok ? "ready" : "unavailable",
    hasMissingConfiguration: !environment.ok,
    locale: "es-MX",
    services: {
      database: databaseReady ? "ready" : "unavailable",
      payments: environment.ok ? "configured" : "unavailable",
      email: emailConfigured ? "configured" : "not_configured",
      rateLimit: globalRateLimitConfigured ? "global" : "local_fallback",
      errorMonitoring: errorMonitoringConfigured ? "configured" : "not_configured",
    },
    missingConfiguration: process.env.NODE_ENV === "production" || environment.ok ? [] : environment.missing,
  }, { status: ok ? 200 : 503 });
}
