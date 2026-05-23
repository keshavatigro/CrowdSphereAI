import type { MatchPhase, SecurityLevel, ZoneStatus } from "./types";

/** Target occupancy as a fraction of zone capacity per match phase */
export const PHASE_OCCUPANCY_RATIO: Record<
  MatchPhase,
  Record<string, number>
> = {
  pre_match: {
    "north-stand": 0.42,
    "south-stand": 0.38,
    "east-terrace": 0.28,
    "west-terrace": 0.25,
    "vip-pavilion": 0.22,
    "food-court": 0.35,
    "parking-a": 0.78,
    "parking-b": 0.72,
  },
  in_play: {
    "north-stand": 0.91,
    "south-stand": 0.89,
    "east-terrace": 0.86,
    "west-terrace": 0.84,
    "vip-pavilion": 0.88,
    "food-court": 0.72,
    "parking-a": 0.32,
    "parking-b": 0.3,
  },
  post_match: {
    "north-stand": 0.68,
    "south-stand": 0.65,
    "east-terrace": 0.58,
    "west-terrace": 0.55,
    "vip-pavilion": 0.5,
    "food-court": 0.78,
    "parking-a": 0.92,
    "parking-b": 0.88,
  },
};

/** Sell-out high-security fixtures — stadium occupancy typically 98–99% in play */
export const HIGH_SECURITY_PHASE_RATIO: Record<
  MatchPhase,
  Record<string, number>
> = {
  pre_match: {
    "north-stand": 0.94,
    "south-stand": 0.93,
    "east-terrace": 0.91,
    "west-terrace": 0.9,
    "vip-pavilion": 0.92,
    "food-court": 0.88,
    "parking-a": 0.96,
    "parking-b": 0.95,
  },
  in_play: {
    "north-stand": 0.99,
    "south-stand": 0.99,
    "east-terrace": 0.985,
    "west-terrace": 0.985,
    "vip-pavilion": 0.99,
    "food-court": 0.97,
    "parking-a": 0.95,
    "parking-b": 0.94,
  },
  post_match: {
    "north-stand": 0.96,
    "south-stand": 0.95,
    "east-terrace": 0.94,
    "west-terrace": 0.93,
    "vip-pavilion": 0.92,
    "food-court": 0.97,
    "parking-a": 0.98,
    "parking-b": 0.97,
  },
};

const PHASE_FLOW: Record<MatchPhase, [number, number]> = {
  pre_match: [110, 165],
  in_play: [35, 85],
  post_match: [150, 235],
};

const PHASE_GATE_QUEUE: Record<MatchPhase, [number, number]> = {
  pre_match: [90, 185],
  in_play: [15, 55],
  post_match: [140, 260],
};

function occupancyTable(securityLevel?: SecurityLevel) {
  return securityLevel === "high"
    ? HIGH_SECURITY_PHASE_RATIO
    : PHASE_OCCUPANCY_RATIO;
}

export function targetOccupancy(
  zoneId: string,
  capacity: number,
  phase: MatchPhase,
  securityLevel?: SecurityLevel,
): number {
  const ratio = occupancyTable(securityLevel)[phase][zoneId] ?? 0.5;
  let effective = ratio;

  if (securityLevel === "high" && !zoneId.startsWith("parking")) {
    const jitter = 0.98 + Math.random() * 0.01;
    effective = Math.max(ratio, jitter);
  }

  return Math.min(capacity, Math.floor(capacity * effective));
}

/** Stadium-wide occupancy target for high-security fixtures by phase */
export function getHighSecurityTargetPct(phase: MatchPhase): number {
  switch (phase) {
    case "in_play":
      return 0.98 + Math.random() * 0.01;
    case "pre_match":
      return 0.95 + Math.random() * 0.02;
    case "post_match":
      return 0.94 + Math.random() * 0.02;
  }
}

/** Scale zone occupancy to hit sell-out band for high-security fixtures */
export function refineHighSecurityOccupancy(
  zones: { id: string; capacity: number; occupancy: number }[],
  phase: MatchPhase,
  securityLevel?: SecurityLevel,
): void {
  if (securityLevel !== "high") return;

  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
  const totalOccupancy = zones.reduce((s, z) => s + z.occupancy, 0);
  if (totalCapacity === 0 || totalOccupancy === 0) return;

  const targetTotal = Math.floor(totalCapacity * getHighSecurityTargetPct(phase));
  const scale = targetTotal / totalOccupancy;

  for (const zone of zones) {
    zone.occupancy = Math.min(
      zone.capacity,
      Math.floor(zone.occupancy * scale),
    );
  }
}

function densityStatus(occupancy: number, capacity: number): ZoneStatus {
  const ratio = occupancy / capacity;
  if (ratio >= 0.92) return "critical";
  if (ratio >= 0.78) return "elevated";
  return "normal";
}

/** Apply phase + security occupancy to all zones (shared by store and sync) */
export function applyOccupancyToZones(
  zones: {
    id: string;
    capacity: number;
    occupancy: number;
    status: ZoneStatus;
    recommendedDirection: "in" | "out" | "hold";
  }[],
  phase: MatchPhase,
  securityLevel: SecurityLevel,
): void {
  for (const zone of zones) {
    zone.occupancy = targetOccupancy(
      zone.id,
      zone.capacity,
      phase,
      securityLevel,
    );
    zone.status = densityStatus(zone.occupancy, zone.capacity);
    zone.recommendedDirection = phaseRecommendedDirection(
      zone.id,
      phase,
      zone.status,
    );
  }

  if (securityLevel === "high") {
    refineHighSecurityOccupancy(zones, phase, securityLevel);
    for (const zone of zones) {
      zone.status = densityStatus(zone.occupancy, zone.capacity);
      zone.recommendedDirection = phaseRecommendedDirection(
        zone.id,
        phase,
        zone.status,
      );
    }
  }
}

export function phaseFlowRate(phase: MatchPhase): number {
  const [lo, hi] = PHASE_FLOW[phase];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function phaseGateQueue(phase: MatchPhase): number {
  const [lo, hi] = PHASE_GATE_QUEUE[phase];
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function phaseRecommendedDirection(
  zoneId: string,
  phase: MatchPhase,
  status: ZoneStatus,
): "in" | "out" | "hold" {
  if (status === "critical") return "hold";

  if (phase === "pre_match") {
    return zoneId.startsWith("parking") ? "out" : "in";
  }
  if (phase === "in_play") {
    if (zoneId.startsWith("parking")) return "in";
    if (zoneId === "food-court") return "in";
    return "hold";
  }
  if (zoneId.startsWith("parking")) return "out";
  return "out";
}

export const PHASE_LABEL: Record<MatchPhase, string> = {
  pre_match: "Pre-match",
  in_play: "In play",
  post_match: "Post-match",
};
