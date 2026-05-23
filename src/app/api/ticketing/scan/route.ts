import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { ticketScanSchema } from "@/lib/schemas";
import { sanitizeText } from "@/lib/security";
import { getStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = ticketScanSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { gateId, section, seat } = parsed.data;

  try {
    const result = getStore().scanTicket(
      gateId,
      sanitizeText(section, 10),
      sanitizeText(seat, 20),
    );
    return jsonOk(result);
  } catch {
    return jsonError("Unknown gate", 404);
  }
}
