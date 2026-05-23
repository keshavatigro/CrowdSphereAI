import { GoogleGenAI } from "@google/genai";
import {
  getActiveFixture,
  getDisplaySecurityLevel,
  SECURITY_LEVEL_LABEL,
} from "./ipl-fixtures";
import { PHASE_LABEL } from "./match-phase-profiles";
import { normalizeRoutingActions } from "./routing";
import type { AIInsight, MatchPhase, RoutingAction, StadiumState } from "./types";

const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function phaseRiskMultiplier(phase: MatchPhase): number {
  if (phase === "in_play") return 1.25;
  if (phase === "post_match") return 1.1;
  return 1;
}

function phaseRecommendations(
  phase: MatchPhase,
  riskScore: number,
): string[] {
  if (phase === "pre_match") {
    return riskScore >= 55
      ? [
          "Stagger gate openings on North/South to flatten ingress spikes",
          "Pre-position stewards at parking-to-gate corridors",
          "Display estimated wait times on concourse signage",
        ]
      : [
          "Ingress within targets — maintain scan rate at G1–G4",
          "Monitor parking fill before opening upper stands",
        ];
  }
  if (phase === "in_play") {
    return riskScore >= 55
      ? [
          "Throttle re-entry at stands above 88% — hold at gate queues",
          "Open auxiliary concourse flow lanes at food court",
          "Keep medical teams on standby at terrace pinch points",
        ]
      : [
          "Seated occupancy stable — limit non-essential concourse traffic",
          "Continue CCTV anomaly sweep every 10 minutes",
        ];
  }
  return riskScore >= 55
    ? [
        "Run phased egress: terraces first, then main stands",
        "Surge parking exit lanes P1/P2 with traffic marshals",
        "PA: direct fans to least congested gate per zone",
      ]
    : [
        "Egress proceeding — keep all gates open until queues clear",
        "Watch food-court exit crush as stands drain",
      ];
}

function rulesBasedInsight(state: StadiumState): AIInsight {
  const criticalZones = state.zones.filter((z) => z.status === "critical");
  const elevated = state.zones.filter((z) => z.status === "elevated");
  const phase = state.matchPhase;

  const routingActions: RoutingAction[] = state.zones.map((z) => {
    const ratio = z.occupancy / z.capacity;
    let direction: RoutingAction["direction"] = z.recommendedDirection;
    let reason = `${PHASE_LABEL[phase]} — follow zone telemetry`;
    let priority = 1;

    if (phase === "pre_match") {
      if (z.id.startsWith("parking")) {
        direction = "out";
        reason = "Pre-match — clear parking lanes for arriving vehicles";
        priority = 2;
      } else if (ratio >= 0.78) {
        direction = "hold";
        reason = "Pre-match — gate queue backing up, pause ingress";
        priority = 4;
      } else {
        direction = "in";
        reason = "Pre-match — safe to admit fans to stand";
        priority = 2;
      }
    } else if (phase === "in_play") {
      if (ratio >= 0.9) {
        direction = "hold";
        reason = "In play — stand near capacity, hold re-entry";
        priority = 5;
      } else if (z.id === "food-court" && ratio >= 0.7) {
        direction = "hold";
        reason = "In play — concourse congestion during innings break";
        priority = 4;
      } else {
        direction = "hold";
        reason = "In play — maintain seated density, minimal movement";
        priority = 2;
      }
    } else if (ratio >= 0.85 && z.id.startsWith("parking")) {
      direction = "out";
      reason = "Post-match — parking at capacity, expedite vehicle exit";
      priority = 5;
    } else if (!z.id.startsWith("parking")) {
      direction = "out";
      reason = "Post-match — prioritized stand egress";
      priority = 3;
    }

    if (ratio >= 0.92) {
      direction = "hold";
      reason = "Critical density — halt movement until below 92%";
      priority = 5;
    }

    return { zoneId: z.id, direction, reason, priority };
  });

  const riskScore = Math.min(
    100,
    Math.round(
      (criticalZones.length * 25 +
        elevated.length * 12 +
        state.activeIncidents.length * 20) *
        phaseRiskMultiplier(phase),
    ),
  );

  const occPct = Math.round(
    (state.totalOccupancy / state.totalCapacity) * 100,
  );

  return {
    summary: `${PHASE_LABEL[phase]} · ${SECURITY_LEVEL_LABEL[state.securityLevel]} — ${state.matchName}: ${criticalZones.length} critical, ${elevated.length} elevated zone(s). Stadium ${occPct}% full. Focus: ${
      phase === "pre_match"
        ? "ingress & parking"
        : phase === "in_play"
          ? "seated density & concourse"
          : "egress & parking exit"
    }.`,
    riskScore,
    routingActions: routingActions.sort((a, b) => b.priority - a.priority),
    emergencyRecommendations: phaseRecommendations(phase, riskScore),
    generatedAt: new Date().toISOString(),
    source: "rules",
    matchPhase: phase,
  };
}

const INSIGHT_SCHEMA = `{
  "summary": "string",
  "riskScore": number 0-100,
  "routingActions": [{"zoneId": "string", "direction": "in"|"out"|"hold", "reason": "string", "priority": number}],
  "emergencyRecommendations": ["string"]
}`;

export async function analyzeStadiumWithGemini(
  state: StadiumState,
): Promise<AIInsight> {
  const client = getClient();
  if (!client) {
    return rulesBasedInsight(state);
  }

  const fixture = getActiveFixture(state);
  const securityLevel = getDisplaySecurityLevel(state);

  const context = {
    matchName: fixture.title,
    matchDate: fixture.date,
    matchId: fixture.id,
    matchPhase: state.matchPhase,
    securityLevel,
    securityLabel: SECURITY_LEVEL_LABEL[securityLevel],
    stewardCount: fixture.stewardCount,
    historicalIncidents: fixture.historicalIncidents,
    weather: state.weather,
    occupancyPct: Math.round(
      (state.totalOccupancy / state.totalCapacity) * 100,
    ),
    zones: state.zones.map((z) => ({
      id: z.id,
      name: z.name,
      occupancy: z.occupancy,
      capacity: z.capacity,
      status: z.status,
      flowRatePerMin: z.flowRatePerMin,
      recommendedDirection: z.recommendedDirection,
    })),
    gates: state.gates.map((g) => ({
      id: g.id,
      queueLength: g.queueLength,
      isOpen: g.isOpen,
    })),
    activeIncidents: state.activeIncidents,
  };

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: `You are an expert stadium crowd-safety AI for cricket venues.
Analyze the live JSON telemetry and return ONLY valid JSON matching this schema (no markdown):
${INSIGHT_SCHEMA}

Security posture: ${securityLevel} (${SECURITY_LEVEL_LABEL[securityLevel]}).
Current match phase: ${state.matchPhase} (${PHASE_LABEL[state.matchPhase]}).
- pre_match: optimize ingress, parking arrival, gate queues
- in_play: protect seated capacity, limit concourse churn
- post_match: prioritize egress, parking exit, phased gate release

Your summary and routingActions MUST differ materially by phase. Do not reuse generic text across phases.
Prioritize: prevent crush conditions, balance gate queues, adapt to match phase and weather.
Use zone ids exactly as provided.

Telemetry:
${JSON.stringify(context)}`,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty Gemini response");

    const parsed = JSON.parse(text) as Omit<AIInsight, "generatedAt" | "source">;

    return {
      summary: String(parsed.summary ?? "Analysis complete."),
      riskScore: Math.min(100, Math.max(0, Math.round(Number(parsed.riskScore) || 0))),
      routingActions: normalizeRoutingActions(parsed.routingActions),
      emergencyRecommendations: Array.isArray(parsed.emergencyRecommendations)
        ? parsed.emergencyRecommendations.map(String)
        : [],
      generatedAt: new Date().toISOString(),
      source: "gemini",
      matchPhase: state.matchPhase,
    };
  } catch {
    return rulesBasedInsight(state);
  }
}

export async function generateEmergencyPlaybook(
  type: string,
  severity: string,
  zoneNames: string[],
  message: string,
): Promise<string[]> {
  const client = getClient();
  const fallback = [
    `Acknowledge ${type} incident (${severity}) in ${zoneNames.join(", ")}`,
    "Notify security lead and venue medical",
    "Close affected ingress routes; open diversion corridors",
    "Issue PA/SMS fan advisory with calm, specific instructions",
    "Log timeline for post-event review",
  ];

  if (!client) return fallback;

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: `Generate a concise emergency playbook (5-8 steps) for a cricket stadium.
Type: ${type}, Severity: ${severity}, Zones: ${zoneNames.join(", ")}
Context: ${message}
Return JSON: {"steps": ["string"]}`,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as { steps?: string[] };
    return parsed.steps?.length ? parsed.steps : fallback;
  } catch {
    return fallback;
  }
}
