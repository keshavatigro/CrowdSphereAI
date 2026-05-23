import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { getSpatialGuidance } from "@/lib/gemini-vision";
import { spatialGuidanceSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const denied = withSecurity(request, { ai: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = spatialGuidanceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const guidance = await getSpatialGuidance(
    parsed.data.sectorId,
    parsed.data.incidentType,
  );

  return jsonOk({ guidance });
}
