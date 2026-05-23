import { GoogleGenAI } from "@google/genai";
import { getBlueprintContext } from "./blueprint";
import type { VisionAnalysis } from "./types";

const MODEL = "gemini-2.5-flash";

const ANALYSIS_SCHEMA = `{
  "location": "string",
  "densityScore": number 1-10,
  "anomalies": ["string"],
  "panicIndicators": boolean,
  "altercationDetected": boolean,
  "unattendedBags": boolean,
  "severity": "low"|"medium"|"high",
  "summary": "string",
  "recommendedZoneAction": "hold"|"in"|"out"|null
}`;

export interface VisionImageInput {
  base64: string;
  mimeType: string;
}

function densityFromPct(zoneOccupancyPct?: number): number {
  return zoneOccupancyPct
    ? Math.min(10, Math.max(1, Math.round(zoneOccupancyPct / 10)))
    : 6;
}

function rulesFallback(
  location: string,
  zoneOccupancyPct?: number,
): VisionAnalysis {
  const density = densityFromPct(zoneOccupancyPct);
  return {
    location,
    densityScore: density,
    anomalies:
      density >= 8 ? ["High crowd density — potential bottleneck"] : [],
    panicIndicators: false,
    altercationDetected: false,
    unattendedBags: false,
    severity: density >= 8 ? "high" : density >= 6 ? "medium" : "low",
    summary: `Rule-based estimate for ${location}: density ${density}/10 from live zone telemetry.`,
    recommendedZoneAction: density >= 8 ? "hold" : null,
    source: "rules",
    analyzedAt: new Date().toISOString(),
  };
}

/** Demo / no-camera mode: infer CCTV-style findings from live zone telemetry + blueprint */
export async function analyzeZoneTelemetryDemo(
  locationLabel: string,
  zoneId: string,
  zoneOccupancyPct: number,
  zoneStatus: string,
  queueHint: number,
): Promise<VisionAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  const density = densityFromPct(zoneOccupancyPct);
  const blueprint = getBlueprintContext();

  if (!apiKey) {
    const analysis = rulesFallback(locationLabel, zoneOccupancyPct);
    analysis.summary = `Demo CCTV simulation for ${locationLabel} (${zoneId}): ${zoneOccupancyPct}% full, queue ~${queueHint}. ${analysis.summary}`;
    if (zoneOccupancyPct >= 88) {
      analysis.anomalies = [
        "Simulated frame sample: shoulder-to-shoulder flow at concourse pinch point",
        "Possible queue spillback toward gate approach",
      ];
      analysis.severity = "high";
      analysis.recommendedZoneAction = "hold";
    }
    return analysis;
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `You are stadium CCTV crowd-safety AI. NO video was uploaded — simulate what sampled CCTV frames would likely show in the last 5 minutes using ONLY this live telemetry:

Location: ${locationLabel} (zone ${zoneId})
Zone occupancy: ${zoneOccupancyPct}%
Zone status: ${zoneStatus}
Approximate gate queue: ${queueHint}

Stadium blueprint:
${blueprint}

Infer realistic density (1-10), anomalies, and flags as if analyzing still frames. Return ONLY JSON:
${ANALYSIS_SCHEMA}`,
      config: {
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as Omit<
      VisionAnalysis,
      "source" | "analyzedAt"
    >;

    return {
      location: parsed.location ?? locationLabel,
      densityScore: Math.min(10, Math.max(1, Math.round(parsed.densityScore ?? density))),
      anomalies: parsed.anomalies?.length
        ? parsed.anomalies
        : density >= 8
          ? ["Telemetry-indicated crush risk at concourse"]
          : [],
      panicIndicators: Boolean(parsed.panicIndicators),
      altercationDetected: Boolean(parsed.altercationDetected),
      unattendedBags: Boolean(parsed.unattendedBags),
      severity: parsed.severity ?? (density >= 8 ? "high" : "medium"),
      summary:
        parsed.summary ??
        `Simulated CCTV assessment for ${locationLabel} at ${zoneOccupancyPct}% capacity.`,
      recommendedZoneAction: parsed.recommendedZoneAction ?? (density >= 8 ? "hold" : null),
      source: "gemini",
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    const fallback = rulesFallback(locationLabel, zoneOccupancyPct);
    fallback.summary = `Demo CCTV simulation for ${locationLabel}: ${fallback.summary}`;
    return fallback;
  }
}

export async function analyzeCctvFrames(
  locationLabel: string,
  images: VisionImageInput[],
  timeWindowMinutes: number,
  zoneOccupancyPct?: number,
): Promise<VisionAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return rulesFallback(locationLabel, zoneOccupancyPct);
  }

  const ai = new GoogleGenAI({ apiKey });
  const blueprint = getBlueprintContext();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text: `You are stadium CCTV crowd-safety vision AI for ${locationLabel}.
Analyze ${images.length} sampled frame(s) representing the last ${timeWindowMinutes} minutes.

Estimate crowd density 1-10. Flag unattended bags, panic (running, hands up, compression), altercations.
Use stadium blueprint for spatial context when recommending egress.

Blueprint:
${blueprint}

Return ONLY valid JSON:
${ANALYSIS_SCHEMA}`,
    },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
  ];

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.15,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as Omit<
      VisionAnalysis,
      "source" | "analyzedAt"
    >;

    return {
      location: parsed.location ?? locationLabel,
      densityScore: Math.min(10, Math.max(1, Math.round(parsed.densityScore ?? 5))),
      anomalies: parsed.anomalies ?? [],
      panicIndicators: Boolean(parsed.panicIndicators),
      altercationDetected: Boolean(parsed.altercationDetected),
      unattendedBags: Boolean(parsed.unattendedBags),
      severity: parsed.severity ?? "medium",
      summary: parsed.summary ?? "Analysis complete.",
      recommendedZoneAction: parsed.recommendedZoneAction ?? null,
      source: "gemini",
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return rulesFallback(locationLabel, zoneOccupancyPct);
  }
}

export async function getSpatialGuidance(
  sectorId: string,
  incidentType: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const blueprint = getBlueprintContext();

  if (!apiKey) {
    const { findNearestSecureExit } = await import("./blueprint");
    const exit = findNearestSecureExit(sectorId);
    return exit
      ? `Nearest secure exit for ${sectorId}: ${exit}.`
      : `Consult map for ${sectorId}.`;
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Stadium blueprint:\n${blueprint}\n\nIncident: ${incidentType} in ${sectorId}.\nGive security one concise routing sentence citing nearest clear secure exit/stairwell from blueprint.`,
    config: { temperature: 0.2 },
  });

  return response.text?.trim() ?? "Refer to stadium blueprint for egress.";
}
