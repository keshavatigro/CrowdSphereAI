import { INITIAL_ZONES } from "./constants";
import type { RoutingAction } from "./types";

const VALID_ZONE_IDS = new Set(INITIAL_ZONES.map((z) => z.id));
const VALID_DIRECTIONS = new Set<RoutingAction["direction"]>(["in", "out", "hold"]);

export function normalizeRoutingActions(
  actions: RoutingAction[] | undefined | null,
): RoutingAction[] {
  if (!actions?.length) return [];

  const normalized: RoutingAction[] = [];

  for (let i = 0; i < actions.length; i++) {
    const raw = actions[i]!;
    const zoneId = String(raw.zoneId ?? "").trim();
    if (!VALID_ZONE_IDS.has(zoneId)) continue;

    const dir = String(raw.direction ?? "hold").toLowerCase();
    const direction: RoutingAction["direction"] = VALID_DIRECTIONS.has(
      dir as RoutingAction["direction"],
    )
      ? (dir as RoutingAction["direction"])
      : "hold";

    const reason = String(raw.reason ?? "AI-recommended routing").trim().slice(0, 300);

    let priority = Number(raw.priority);
    if (!Number.isFinite(priority)) priority = i + 1;
    priority = Math.min(10, Math.max(1, Math.round(priority)));

    normalized.push({ zoneId, direction, reason, priority });
  }

  return normalized;
}
