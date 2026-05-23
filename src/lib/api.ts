import { NextRequest, NextResponse } from "next/server";
import { checkAiRateLimit, checkRateLimit, getClientId } from "./security";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function withSecurity(
  request: NextRequest,
  options?: { ai?: boolean },
): NextResponse | null {
  const clientId = getClientId(request);
  const limit = options?.ai ? checkAiRateLimit(clientId) : checkRateLimit(clientId);

  if (!limit.ok) {
    return jsonError("Rate limit exceeded", 429);
  }

  return null;
}
