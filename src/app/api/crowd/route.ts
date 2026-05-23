import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { normalizeRoutingActions } from "@/lib/routing";
import { routingSchema } from "@/lib/schemas";
import { sanitizeText } from "@/lib/security";
import { getStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  const state = getStore().getState();
  return jsonOk({ zones: state.zones, gates: state.gates });
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

  const parsed = routingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const actions = normalizeRoutingActions(
    parsed.data.actions.map((a) => ({
      ...a,
      reason: sanitizeText(a.reason, 300),
    })),
  );

  if (actions.length === 0) {
    return jsonError("No valid routing actions for known stadium zones", 400);
  }

  const store = getStore();
  const state = store.applyRouting(actions);

  for (const action of actions) {
    store.setSignage(
      action.zoneId,
      `Routing: ${action.direction.toUpperCase()} — ${action.reason.slice(0, 80)}`,
    );
  }

  return jsonOk({
    state,
    applied: actions.length,
    actions,
  });
}
