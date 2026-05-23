import { v4 as uuid } from "uuid";
import { broadcast } from "./broadcast";
import {
  INITIAL_GATES,
  INITIAL_ZONES,
  VALID_SECTIONS,
} from "./constants";
import {
  DEFAULT_FIXTURE,
  getFixtureById,
  syncFixtureMetadata,
  type IplFixture,
} from "./ipl-fixtures";
import { getMatchBroadcastStatus } from "./match-broadcast";
import {
  applyOccupancyToZones,
  phaseFlowRate,
  phaseGateQueue,
  phaseRecommendedDirection,
  refineHighSecurityOccupancy,
  targetOccupancy,
} from "./match-phase-profiles";
import type {
  AIInsight,
  EmergencyIncident,
  EmergencySeverity,
  EmergencyType,
  FanNotification,
  MatchPhase,
  RoutingAction,
  StadiumState,
  TicketEvent,
  VisionAlert,
  VisionAnalysis,
  Zone,
  ZoneStatus,
} from "./types";

function densityStatus(occupancy: number, capacity: number): ZoneStatus {
  const ratio = occupancy / capacity;
  if (ratio >= 0.92) return "critical";
  if (ratio >= 0.78) return "elevated";
  return "normal";
}

function createInitialZones(
  phase: MatchPhase = "in_play",
  securityLevel = DEFAULT_FIXTURE.securityLevel,
): Zone[] {
  const zones = INITIAL_ZONES.map((z) => ({
    ...z,
    occupancy: 0,
    status: "normal" as ZoneStatus,
    flowRatePerMin: phaseFlowRate(phase),
    recommendedDirection: "in" as const,
    lastUpdated: new Date().toISOString(),
  }));
  applyOccupancyToZones(zones, phase, securityLevel);
  return zones;
}

function applyPhaseProfile(
  state: StadiumState,
  phase: MatchPhase,
  securityLevel = state.securityLevel,
): void {
  const now = new Date().toISOString();
  applyOccupancyToZones(state.zones, phase, securityLevel);
  for (const zone of state.zones) {
    zone.flowRatePerMin = phaseFlowRate(phase);
    zone.lastUpdated = now;
  }

  for (const gate of state.gates) {
    gate.queueLength = phaseGateQueue(phase);
    gate.isOpen = true;
  }
}

function scaleOccupancyForAttendance(
  state: StadiumState,
  expectedAttendance: number,
): void {
  const baseline = 52_100;
  const scale = Math.min(1.05, Math.max(0.82, expectedAttendance / baseline));
  for (const zone of state.zones) {
    zone.occupancy = Math.min(
      zone.capacity,
      Math.floor(zone.occupancy * scale),
    );
    zone.status = densityStatus(zone.occupancy, zone.capacity);
    zone.recommendedDirection = phaseRecommendedDirection(
      zone.id,
      state.matchPhase,
      zone.status,
    );
  }
}

function applyFixtureToState(state: StadiumState, fixture: IplFixture): void {
  state.matchId = fixture.id;
  state.matchName = fixture.title;
  state.matchDate = fixture.date;
  state.securityLevel = fixture.securityLevel;
  applyPhaseProfile(state, state.matchPhase, fixture.securityLevel);
  if (fixture.securityLevel !== "high") {
    scaleOccupancyForAttendance(state, fixture.expectedAttendance);
  }
}

class StadiumStore {
  private state: StadiumState;

  constructor() {
    this.state = this.buildState("in_play", "Clear, 28°C");
  }

  private buildState(matchPhase: MatchPhase, weather: string): StadiumState {
    const zones = createInitialZones(matchPhase, DEFAULT_FIXTURE.securityLevel);
    const gates = INITIAL_GATES.map((g) => ({
      ...g,
      ticketsScanned: Math.floor(Math.random() * 800),
      queueLength: phaseGateQueue(matchPhase),
      isOpen: true,
    }));

    const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
    const totalOccupancy = zones.reduce((s, z) => s + z.occupancy, 0);

    return {
      matchId: DEFAULT_FIXTURE.id,
      matchName: DEFAULT_FIXTURE.title,
      matchDate: DEFAULT_FIXTURE.date,
      matchBroadcast: getMatchBroadcastStatus(DEFAULT_FIXTURE.date),
      securityLevel: DEFAULT_FIXTURE.securityLevel,
      matchPhase,
      weather,
      totalCapacity,
      totalOccupancy,
      zones,
      gates,
      recentTickets: [],
      activeIncidents: [],
      visionAlerts: [],
      fanNotifications: [],
      signageMessages: {},
      updatedAt: new Date().toISOString(),
    };
  }

  getState(): StadiumState {
    syncFixtureMetadata(this.state);
    return structuredClone(this.state);
  }

  setMatchPhase(phase: MatchPhase): StadiumState {
    this.state.matchPhase = phase;
    const fixture = getFixtureById(this.state.matchId);
    const securityLevel = fixture?.securityLevel ?? this.state.securityLevel;
    applyPhaseProfile(this.state, phase, securityLevel);
    if (fixture && fixture.securityLevel !== "high") {
      scaleOccupancyForAttendance(this.state, fixture.expectedAttendance);
    }
    this.state.lastInsight = undefined;
    this.recalcTotals();
    this.touch();
    return this.getState();
  }

  setMatchFixture(fixtureId: string): StadiumState {
    const fixture = getFixtureById(fixtureId);
    if (!fixture) {
      throw new Error(`Unknown fixture: ${fixtureId}`);
    }
    applyFixtureToState(this.state, fixture);
    this.state.lastInsight = undefined;
    this.recalcTotals();
    this.touch();
    return this.getState();
  }

  setWeather(weather: string): StadiumState {
    this.state.weather = weather;
    this.touch();
    return this.getState();
  }

  scanTicket(gateId: string, section: string, seat: string): {
    state: StadiumState;
    event: TicketEvent;
  } {
    const gate = this.state.gates.find((g) => g.id === gateId);
    if (!gate) throw new Error("Unknown gate");

    const valid =
      VALID_SECTIONS.includes(section as (typeof VALID_SECTIONS)[number]) &&
      seat.length >= 1;

    const event: TicketEvent = {
      id: uuid(),
      gateId,
      section,
      seat,
      timestamp: new Date().toISOString(),
      valid,
    };

    if (valid) {
      gate.ticketsScanned += 1;
      gate.queueLength = Math.max(0, gate.queueLength - 2);
      const zone = this.state.zones.find((z) => z.id === gate.zoneId);
      if (zone && this.state.matchPhase !== "post_match") {
        zone.occupancy = Math.min(zone.occupancy + 1, zone.capacity);
        zone.status = densityStatus(zone.occupancy, zone.capacity);
      }
    }

    this.state.recentTickets = [event, ...this.state.recentTickets].slice(0, 50);
    this.recalcTotals();
    this.touch();
    broadcast({ type: "ticket", payload: event });
    return { state: this.getState(), event };
  }

  applyRouting(actions: RoutingAction[]): StadiumState {
    for (const action of actions) {
      const zone = this.state.zones.find((z) => z.id === action.zoneId);
      if (!zone) continue;
      zone.recommendedDirection = action.direction;
      if (action.direction === "hold") zone.status = "closed";
      else zone.status = densityStatus(zone.occupancy, zone.capacity);
      zone.lastUpdated = new Date().toISOString();
    }
    this.touch();
    broadcast({ type: "routing", payload: actions });
    return this.getState();
  }

  triggerEmergency(
    type: EmergencyType,
    severity: EmergencySeverity,
    zoneIds: string[],
    message: string,
    playbook: string[],
  ): EmergencyIncident {
    const incident: EmergencyIncident = {
      id: uuid(),
      type,
      severity,
      zoneIds,
      message,
      status: "active",
      playbook,
      createdAt: new Date().toISOString(),
    };

    this.state.activeIncidents = [incident, ...this.state.activeIncidents];

    for (const zoneId of zoneIds) {
      const zone = this.state.zones.find((z) => z.id === zoneId);
      if (zone) {
        zone.recommendedDirection = "hold";
        zone.status = severity === "critical" ? "closed" : "critical";
      }
      for (const gate of this.state.gates.filter((g) => g.zoneId === zoneId)) {
        if (severity === "critical" || type === "evacuation") {
          gate.isOpen = false;
        }
      }
    }

    this.touch();
    broadcast({ type: "emergency", payload: incident });
    return incident;
  }

  resolveEmergency(incidentId: string): StadiumState {
    const incident = this.state.activeIncidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.status = "resolved";
      incident.resolvedAt = new Date().toISOString();
    }
    this.state.activeIncidents = this.state.activeIncidents.filter(
      (i) => i.status === "active",
    );
    this.touch();
    return this.getState();
  }

  setInsight(insight: AIInsight): StadiumState {
    this.state.lastInsight = insight;
    this.touch();
    broadcast({ type: "insight", payload: insight });
    return this.getState();
  }

  recordVisionAlert(
    zoneId: string,
    location: string,
    analysis: VisionAnalysis,
  ): VisionAlert {
    const event =
      analysis.densityScore >= 8 || analysis.severity === "high"
        ? "surge"
        : analysis.anomalies.length > 0
          ? "anomaly"
          : "normal";

    const alert: VisionAlert = {
      id: uuid(),
      zoneId,
      location,
      event,
      severity: analysis.severity,
      densityScore: analysis.densityScore,
      analysis,
      createdAt: new Date().toISOString(),
    };

    this.state.visionAlerts = [alert, ...this.state.visionAlerts].slice(0, 20);

    const zone = this.state.zones.find((z) => z.id === zoneId);
    if (zone && analysis.recommendedZoneAction) {
      zone.recommendedDirection = analysis.recommendedZoneAction;
      if (analysis.recommendedZoneAction === "hold") {
        zone.status = "critical";
      }
      const pct = Math.min(
        zone.capacity,
        Math.floor(zone.capacity * (analysis.densityScore / 10)),
      );
      zone.occupancy = Math.max(zone.occupancy, pct);
      zone.status = densityStatus(zone.occupancy, zone.capacity);
    }

    this.recalcTotals();
    this.touch();
    broadcast({ type: "vision", payload: alert });
    return alert;
  }

  executeShelterProtocol(zoneIds: string[]): StadiumState {
    const openAir = zoneIds.length ? zoneIds : ["east-terrace", "west-terrace", "parking-a", "parking-b"];
    for (const zoneId of openAir) {
      const zone = this.state.zones.find((z) => z.id === zoneId);
      if (zone) {
        zone.recommendedDirection = "hold";
        zone.status = "closed";
        this.state.signageMessages[zoneId] =
          "⚡ Weather hold — proceed to covered concourse / shelter immediately";
      }
      for (const gate of this.state.gates.filter((g) => g.zoneId === zoneId)) {
        gate.isOpen = false;
      }
    }
    this.state.weather = "Lightning alert — shelter protocol active";
    this.touch();
    return this.getState();
  }

  publishFanNotification(
    message: string,
    targetZones: string[],
  ): { notification: FanNotification; state: StadiumState } {
    const notification: FanNotification = {
      id: uuid(),
      message,
      targetZones,
      createdAt: new Date().toISOString(),
    };
    this.state.fanNotifications = [
      notification,
      ...this.state.fanNotifications,
    ].slice(0, 30);
    for (const zid of targetZones) {
      this.state.signageMessages[zid] = message;
    }
    this.touch();
    broadcast({ type: "notification", payload: notification });
    return { notification, state: this.getState() };
  }

  setSignage(zoneId: string, message: string): StadiumState {
    this.state.signageMessages[zoneId] = message;
    this.touch();
    return this.getState();
  }

  /** Simulates live sensor drift for demo real-time updates */
  tickSimulation(): StadiumState {
    const phase = this.state.matchPhase;
    const securityLevel = this.state.securityLevel;
    const driftScale =
      securityLevel === "high"
        ? 0.25
        : phase === "post_match"
          ? 1.35
          : phase === "pre_match"
            ? 1.15
            : 0.85;

    for (const zone of this.state.zones) {
      const target = targetOccupancy(
        zone.id,
        zone.capacity,
        phase,
        securityLevel,
      );
      const towardTarget = target > zone.occupancy ? 1 : -1;
      const pull =
        securityLevel === "high" ? 8 + Math.floor(Math.random() * 5) : 4;
      const delta =
        Math.floor((Math.random() - 0.42) * 28 * driftScale) +
        towardTarget * (pull + Math.floor(Math.random() * 4));

      zone.occupancy = Math.max(
        0,
        Math.min(zone.capacity, zone.occupancy + delta),
      );
      zone.flowRatePerMin = Math.max(
        20,
        Math.min(250, zone.flowRatePerMin + Math.floor((Math.random() - 0.5) * 16)),
      );
      if (zone.status !== "closed") {
        zone.status = densityStatus(zone.occupancy, zone.capacity);
        zone.recommendedDirection = phaseRecommendedDirection(
          zone.id,
          phase,
          zone.status,
        );
      }
      const targetQueue = phaseGateQueue(phase);
      for (const gate of this.state.gates.filter((g) => g.zoneId === zone.id)) {
        const qDelta =
          Math.floor((Math.random() - 0.45) * 12) +
          (targetQueue > gate.queueLength ? 1 : -1) * 3;
        gate.queueLength = Math.max(0, Math.min(300, gate.queueLength + qDelta));
      }
    }

    if (securityLevel === "high") {
      refineHighSecurityOccupancy(this.state.zones, phase, securityLevel);
      for (const zone of this.state.zones) {
        if (zone.status !== "closed") {
          zone.status = densityStatus(zone.occupancy, zone.capacity);
          zone.recommendedDirection = phaseRecommendedDirection(
            zone.id,
            phase,
            zone.status,
          );
        }
      }
    }

    this.recalcTotals();
    this.touch();
    return this.getState();
  }

  private recalcTotals(): void {
    this.state.totalOccupancy = this.state.zones.reduce(
      (s, z) => s + z.occupancy,
      0,
    );
  }

  private touch(): void {
    this.state.updatedAt = new Date().toISOString();
    broadcast({ type: "state", payload: this.getState() });
  }
}

const globalForStore = globalThis as unknown as { __crowdsphereStore?: StadiumStore };

export function getStore(): StadiumStore {
  if (!globalForStore.__crowdsphereStore) {
    globalForStore.__crowdsphereStore = new StadiumStore();
  }
  return globalForStore.__crowdsphereStore;
}
