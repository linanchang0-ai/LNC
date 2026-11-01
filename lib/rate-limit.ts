import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = { count: number; resetAt: number };

const requests = new Map<string, RateLimitEntry>();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redis = redisUrl && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: redisUrl.startsWith("http") ? redisUrl : `https://${redisUrl}`, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;
const globalLimiters = new Map<string, Ratelimit>();

function clientIp(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

async function identifier(request: Request, scope: string) {
  const value = new TextEncoder().encode(`${scope}:${clientIp(request)}`);
  const hash = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Inténtalo de nuevo más tarde." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

function localRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const current = requests.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  requests.set(key, entry);

  if (requests.size > 10_000) {
    for (const [storedKey, storedEntry] of requests) if (storedEntry.resetAt <= now) requests.delete(storedKey);
  }
  if (entry.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return tooManyRequests(retryAfter);
}

export async function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  if (!redis) return localRateLimit(request, scope, limit, windowMs);
  const configKey = `${scope}:${limit}:${windowMs}`;
  const limiter = globalLimiters.get(configKey) ?? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: "lnc-sports:rate-limit",
    analytics: false,
  });
  globalLimiters.set(configKey, limiter);
  try {
    const result = await limiter.limit(await identifier(request, scope));
    return result.success ? null : tooManyRequests(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
  } catch {
    return localRateLimit(request, scope, limit, windowMs);
  }
}