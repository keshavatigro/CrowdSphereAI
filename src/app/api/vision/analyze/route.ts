import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { analyzeCctvFrames, analyzeZoneTelemetryDemo } from "@/lib/gemini-vision";
import { visionAnalyzeSchema } from "@/lib/schemas";
import { getStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const denied = withSecurity(request, { ai: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = visionAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { locationLabel, zoneId, timeWindowMinutes, demo, images } = parsed.data;
  const state = getStore().getState();
  const zone = state.zones.find((z) => z.id === zoneId);
  const occupancyPct = zone
    ? Math.round((zone.occupancy / zone.capacity) * 100)
    : 50;

  const gateQueue = state.gates
    .filter((g) => g.zoneId === zoneId)
    .reduce((max, g) => Math.max(max, g.queueLength), 0);

  const analysis =
    demo === true
      ? await analyzeZoneTelemetryDemo(
          locationLabel,
          zoneId,
          occupancyPct,
          zone?.status ?? "normal",
          gateQueue,
        )
      : await analyzeCctvFrames(
          locationLabel,
          images!,
          timeWindowMinutes,
          occupancyPct,
        );

  const alert = getStore().recordVisionAlert(zoneId, locationLabel, analysis);

  return jsonOk({
    analysis,
    alert,
    state: getStore().getState(),
  });
}
