import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { generateEmergencyPlaybook } from "@/lib/gemini";
import { emergencySchema, resolveEmergencySchema } from "@/lib/schemas";
import { sanitizeText } from "@/lib/security";
import { getStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  const state = getStore().getState();
  return jsonOk({ incidents: state.activeIncidents });
}

export async function POST(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = emergencySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { type, severity, zoneIds, message } = parsed.data;
  const state = getStore().getState();
  const zoneNames = state.zones
    .filter((z) => zoneIds.includes(z.id))
    .map((z) => z.name);

  const playbook = await generateEmergencyPlaybook(
    type,
    severity,
    zoneNames,
    sanitizeText(message),
  );

  const incident = getStore().triggerEmergency(
    type,
    severity,
    zoneIds,
    sanitizeText(message),
    playbook,
  );

  return jsonOk({ incident, state: getStore().getState() });
}

export async function PATCH(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = resolveEmergencySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const state = getStore().resolveEmergency(parsed.data.incidentId);
  return jsonOk({ state });
}
