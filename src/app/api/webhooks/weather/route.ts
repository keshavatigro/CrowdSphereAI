import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { generateEmergencyPlaybook } from "@/lib/gemini";
import { weatherWebhookSchema } from "@/lib/schemas";
import { getStore } from "@/lib/store";
import { getBlueprint } from "@/lib/blueprint";

/** Demo: lightning webhook → shelter protocol + optional copilot escalation */
export async function POST(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = weatherWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { distanceMiles } = parsed.data;
  const zoneIds =
    parsed.data.zoneIds ?? getBlueprint().openAirZones;

  if (distanceMiles > 3) {
    return jsonOk({
      action: "monitor",
      message: `Lightning ${distanceMiles} mi away — below 3 mi shelter threshold.`,
      state: getStore().getState(),
    });
  }

  const store = getStore();
  const state = store.executeShelterProtocol(zoneIds);
  const playbook = await generateEmergencyPlaybook(
    "weather",
    "high",
    zoneIds,
    `Lightning detected ${distanceMiles} miles from stadium`,
  );
  const incident = store.triggerEmergency(
    "weather",
    "high",
    zoneIds,
    `Lightning ${distanceMiles} mi — shelter protocol auto-executed`,
    playbook,
  );

  return jsonOk({
    action: "execute_shelter_protocol",
    distanceMiles,
    incidentId: incident.id,
    message:
      "Shelter protocol triggered: open-air gates closed, signage updated. Route to Command Copilot for fan comms.",
    state,
  });
}
