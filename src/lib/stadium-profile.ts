import profile from "@/data/stadium-profile.json";
import {
  getActiveFixture,
  getDisplaySecurityLevel,
  SECURITY_LEVEL_LABEL,
  securityLevelRiskBias,
} from "./ipl-fixtures";
import type { Gate, StadiumState } from "./types";

export type StadiumProfile = typeof profile;

export function getStadiumProfile(): StadiumProfile {
  return profile;
}

export function getMatchesWithSecurityIssues() {
  return profile.recentMatches.filter((m) => m.securityIncidents > 0);
}

export function getSecurityByGate(gateId: string) {
  return profile.securityRecords.filter((r) => r.gate === gateId);
}

export function computeRiskScore(state: StadiumState): {
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  factors: string[];
} {
  const factors: string[] = [];
  let score = state.lastInsight?.riskScore ?? 20;

  const critical = state.zones.filter((z) => z.status === "critical").length;
  const elevated = state.zones.filter((z) => z.status === "elevated").length;
  if (critical > 0) {
    score += critical * 12;
    factors.push(`${critical} zone(s) at critical density`);
  }
  if (elevated > 0) {
    score += elevated * 5;
    factors.push(`${elevated} zone(s) elevated`);
  }
  if (state.activeIncidents.length > 0) {
    score += state.activeIncidents.length * 15;
    factors.push(`${state.activeIncidents.length} active emergency(s)`);
  }
  const highVision = state.visionAlerts.filter((a) => a.severity === "high").length;
  if (highVision > 0) {
    score += highVision * 10;
    factors.push(`${highVision} high-severity vision alert(s)`);
  }
  if (state.matchPhase === "post_match") {
    score += 8;
    factors.push("Post-match egress phase");
  }

  const fixture = getActiveFixture(state);
  const securityLevel = getDisplaySecurityLevel(state);
  const securityBias = securityLevelRiskBias(securityLevel);
  if (securityBias !== 0) {
    score += securityBias;
    factors.push(
      `${SECURITY_LEVEL_LABEL[securityLevel]} deployment (${fixture.stewardCount} stewards)`,
    );
  }
  if (fixture.historicalIncidents > 0) {
    score += fixture.historicalIncidents * 4;
    factors.push(
      `${fixture.historicalIncidents} prior incident(s) on record for ${fixture.title}`,
    );
  }

  const longQueues = state.gates.filter((g) => g.queueLength > 120).length;
  if (longQueues > 0) {
    score += longQueues * 6;
    factors.push(`${longQueues} gate(s) with queue >120`);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const level =
    score >= 75 ? "critical" : score >= 50 ? "high" : score >= 30 ? "moderate" : "low";

  if (factors.length === 0) factors.push("All systems within normal parameters");

  return { score, level, factors };
}

export function mergeLiveGateStatus(liveGates: Gate[]) {
  return profile.gates.map((g) => {
    const live = liveGates.find((lg) => lg.id === g.id);
    const incidents = getSecurityByGate(g.id);
    return {
      ...g,
      isOpen: live?.isOpen ?? true,
      queueLength: live?.queueLength ?? 0,
      ticketsScanned: live?.ticketsScanned ?? 0,
      historicalIncidents: incidents.length,
      lastIncident: incidents[0]?.summary,
    };
  });
}
