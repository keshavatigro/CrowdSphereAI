import { NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const AI_RATE_LIMIT_MAX = 15;

export function getClientId(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

export function checkRateLimit(
  clientId: string,
  max: number = RATE_LIMIT_MAX,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { ok: true };
}

export function checkAiRateLimit(clientId: string) {
  return checkRateLimit(`ai:${clientId}`, AI_RATE_LIMIT_MAX);
}

export function sanitizeText(input: string, maxLen = 500): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim()
    .slice(0, maxLen);
}
