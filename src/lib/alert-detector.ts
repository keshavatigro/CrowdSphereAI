import { computeRiskScore } from "./stadium-profile";
import type {
  AIInsight,
  EmergencyIncident,
  StadiumState,
  VisionAlert,
  Zone,
} from "./types";

export interface VoiceAlertMessage {
  id: string;
  priority: number;
  text: string;
}

function zonePct(zone: Zone): number {
  return Math.round((zone.occupancy / zone.capacity) * 100);
}

function directionAction(direction: Zone["recommendedDirection"]): string {
  if (direction === "hold") {
    return "Hold ingress and display wait messaging at affected gates.";
  }
  if (direction === "out") {
    return "Open egress routes and direct fans to the nearest clear gate.";
  }
  return "Continue controlled admission with queue monitoring.";
}

function severityWord(severity: string): string {
  return severity === "critical" ? "critical" : severity;
}

function insightAction(insight: AIInsight): string {
  const top = [...insight.routingActions].sort(
    (a, b) => b.priority - a.priority,
  )[0];
  if (top) {
    return `${top.zoneId}: ${top.direction}. ${top.reason}`;
  }
  const rec = insight.emergencyRecommendations[0];
  return rec ?? "Review Gemini advisor and apply routing plan.";
}

function riskRank(level: string): number {
  if (level === "critical") return 4;
  if (level === "high") return 3;
  if (level === "moderate") return 2;
  return 1;
}

export function detectVoiceAlerts(
  prev: StadiumState,
  next: StadiumState,
): VoiceAlertMessage[] {
  const alerts: VoiceAlertMessage[] = [];

  for (const zone of next.zones) {
    const before = prev.zones.find((z) => z.id === zone.id);
    if (zone.status === "critical" && before?.status !== "critical") {
      alerts.push({
        id: `zone-critical-${zone.id}`,
        priority: 90,
        text: `Warning. ${zone.name} is at critical density, ${zonePct(zone)} percent full. Action. ${directionAction(zone.recommendedDirection)}`,
      });
    } else if (zone.status === "elevated" && before?.status === "normal") {
      alerts.push({
        id: `zone-elevated-${zone.id}`,
        priority: 55,
        text: `Advisory. ${zone.name} density elevated at ${zonePct(zone)} percent. Action. ${directionAction(zone.recommendedDirection)}`,
      });
    }
  }

  for (const gate of next.gates) {
    const before = prev.gates.find((g) => g.id === gate.id);
    if (gate.queueLength >= 120 && (before?.queueLength ?? 0) < 120) {
      alerts.push({
        id: `gate-queue-${gate.id}`,
        priority: 60,
        text: `Warning. ${gate.name} queue exceeds 120. Action. Open auxiliary lanes or throttle entry to linked zones.`,
      });
    }
    if (!gate.isOpen && prev.gates.find((g) => g.id === gate.id)?.isOpen) {
      alerts.push({
        id: `gate-closed-${gate.id}`,
        priority: 70,
        text: `Notice. ${gate.name} is now closed. Action. Reroute fans to the nearest open gate and update signage.`,
      });
    }
  }

  for (const incident of next.activeIncidents) {
    if (!prev.activeIncidents.some((i) => i.id === incident.id)) {
      alerts.push({
        id: `emergency-${incident.id}`,
        priority: 100,
        text: formatEmergencyAlert(incident),
      });
    }
  }

  for (const alert of next.visionAlerts) {
    if (!prev.visionAlerts.some((a) => a.id === alert.id)) {
      alerts.push({
        id: `vision-${alert.id}`,
        priority: alert.severity === "high" ? 85 : 65,
        text: formatVisionAlert(alert, next),
      });
    }
  }

  if (
    next.lastInsight &&
    next.lastInsight.generatedAt !== prev.lastInsight?.generatedAt &&
    next.lastInsight.riskScore >= 55
  ) {
    alerts.push({
      id: `insight-${next.lastInsight.generatedAt}`,
      priority: next.lastInsight.riskScore >= 70 ? 80 : 50,
      text: `AI advisor. Risk score ${next.lastInsight.riskScore}. ${next.lastInsight.summary.slice(0, 120)}. Action. ${insightAction(next.lastInsight)}`,
    });
  }

  const prevRisk = computeRiskScore(prev);
  const nextRisk = computeRiskScore(next);
  if (riskRank(nextRisk.level) > riskRank(prevRisk.level)) {
    alerts.push({
      id: `risk-level-${nextRisk.level}-${next.updatedAt}`,
      priority: nextRisk.level === "critical" ? 88 : 62,
      text: `Risk level increased to ${nextRisk.level}. ${nextRisk.factors[0] ?? "Review dashboard"}. Action. Check Gemini advisor and deploy stewards to hot zones.`,
    });
  }

  return alerts.sort((a, b) => b.priority - a.priority);
}

function formatEmergencyAlert(incident: EmergencyIncident): string {
  const zones = incident.zoneIds.join(", ");
  const step =
    incident.playbook[0] ??
    "Notify security lead and follow venue emergency protocol.";
  return `Emergency. ${incident.type.replace(/_/g, " ")} with ${severityWord(incident.severity)} severity in ${zones}. ${incident.message}. Action. ${step}`;
}

function formatVisionAlert(alert: VisionAlert, state: StadiumState): string {
  const zone = state.zones.find((z) => z.id === alert.zoneId);
  const zoneName = zone?.name ?? alert.location;
  const action =
    alert.analysis.recommendedZoneAction != null
      ? directionAction(alert.analysis.recommendedZoneAction)
      : alert.analysis.summary;
  return `Vision alert. ${alert.severity} severity at ${zoneName}. ${alert.analysis.summary.slice(0, 100)}. Action. ${action}`;
}
