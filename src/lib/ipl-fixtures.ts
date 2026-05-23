import { getMatchBroadcastStatus } from "./match-broadcast";
import { applyOccupancyToZones } from "./match-phase-profiles";
import type { SecurityLevel, StadiumState } from "./types";

/** Sum of INITIAL zone capacities — sell-out reference for high-security fixtures */
export const STADIUM_ZONE_CAPACITY = 58_000;

export interface IplFixture {
  id: string;
  title: string;
  date: string;
  competition: string;
  expectedAttendance: number;
  securityLevel: SecurityLevel;
  /** Recorded security incidents at this venue for this fixture */
  historicalIncidents: number;
  stewardCount: number;
  k9Units: number;
  bagCheckMode: "sampled" | "full";
  notes: string;
}

export const IPL_FIXTURES: IplFixture[] = [
  {
    id: "srh-rcb-2026",
    title: "SRH vs RCB",
    date: "May 23, 2026",
    competition: "IPL 2026",
    expectedAttendance: 57_130,
    securityLevel: "high",
    historicalIncidents: 0,
    stewardCount: 940,
    k9Units: 4,
    bagCheckMode: "full",
    notes:
      "High-security weekend blockbuster — max stewards, full bag screening, and terrace marshals at North/South.",
  },
  {
    id: "srh-mi-2026",
    title: "SRH vs MI",
    date: "May 15, 2026",
    competition: "IPL 2026",
    expectedAttendance: 57_130,
    securityLevel: "high",
    historicalIncidents: 1,
    stewardCount: 900,
    k9Units: 4,
    bagCheckMode: "full",
    notes:
      "High-security deployment — prior gate incident; reinforced screening at G3/G4 and concourse patrols.",
  },
  {
    id: "srh-gt-2026",
    title: "SRH vs GT",
    date: "May 1, 2026",
    competition: "IPL 2026",
    expectedAttendance: 57_130,
    securityLevel: "high",
    historicalIncidents: 0,
    stewardCount: 860,
    k9Units: 3,
    bagCheckMode: "full",
    notes:
      "High-security fixture — elevated fan-zone staffing and parking egress controls despite mid-week slot.",
  },
  {
    id: "srh-csk-2026",
    title: "SRH vs CSK",
    date: "May 8, 2026",
    competition: "IPL 2026",
    expectedAttendance: 46800,
    securityLevel: "low",
    historicalIncidents: 0,
    stewardCount: 420,
    k9Units: 0,
    bagCheckMode: "sampled",
    notes: "Weekday fixture — reduced perimeter staffing and sampled bag checks.",
  },
  {
    id: "srh-rr-2026",
    title: "SRH vs RR",
    date: "Apr 5, 2026",
    competition: "IPL 2026",
    expectedAttendance: 48500,
    securityLevel: "standard",
    historicalIncidents: 0,
    stewardCount: 580,
    k9Units: 1,
    bagCheckMode: "full",
    notes: "Season home opener — standard protocols.",
  },
  {
    id: "srh-kkr-2026",
    title: "SRH vs KKR",
    date: "Apr 28, 2026",
    competition: "IPL 2026",
    expectedAttendance: 51200,
    securityLevel: "standard",
    historicalIncidents: 2,
    stewardCount: 640,
    k9Units: 2,
    bagCheckMode: "full",
    notes:
      "Standard deployment with historical incident watch — extra CCTV on terraces.",
  },
  {
    id: "srh-pbks-2026",
    title: "SRH vs PBKS",
    date: "Apr 20, 2026",
    competition: "IPL 2026",
    expectedAttendance: 50500,
    securityLevel: "standard",
    historicalIncidents: 3,
    stewardCount: 660,
    k9Units: 2,
    bagCheckMode: "full",
    notes:
      "Standard deployment — prior incidents logged; monitor North Stand ingress.",
  },
];

export const DEFAULT_FIXTURE_ID = "srh-rcb-2026";

export const DEFAULT_FIXTURE =
  IPL_FIXTURES.find((f) => f.id === DEFAULT_FIXTURE_ID) ?? IPL_FIXTURES[0];

export function getFixtureById(id: string): IplFixture | undefined {
  return IPL_FIXTURES.find((f) => f.id === id);
}

/** Resolve fixture id from state (handles legacy snapshots missing matchId). */
export function resolveFixtureId(state: Pick<StadiumState, "matchId" | "matchName">): string {
  if (state.matchId && getFixtureById(state.matchId)) {
    return state.matchId;
  }
  const byTitle = IPL_FIXTURES.find(
    (f) => f.title.toLowerCase() === state.matchName.toLowerCase(),
  );
  return byTitle?.id ?? DEFAULT_FIXTURE_ID;
}

export function getActiveFixture(
  state: Pick<StadiumState, "matchId" | "matchName">,
): IplFixture {
  const id = resolveFixtureId(state);
  return getFixtureById(id) ?? DEFAULT_FIXTURE;
}

/** Always use catalog security tier for the selected match (source of truth). */
export function getDisplaySecurityLevel(
  state: Pick<StadiumState, "matchId" | "matchName" | "securityLevel">,
): SecurityLevel {
  return getActiveFixture(state).securityLevel;
}

function occupancyFloorForSecurity(
  level: SecurityLevel,
  phase: StadiumState["matchPhase"],
): number {
  if (level !== "high") return 0;
  if (phase === "in_play") return 0.95;
  if (phase === "pre_match") return 0.9;
  return 0.88;
}

/** Keep match metadata aligned with the fixture catalog. */
export function syncFixtureMetadata(state: StadiumState): void {
  const prevId = state.matchId;
  const prevLevel = state.securityLevel;
  const fixture = getActiveFixture(state);
  state.matchId = fixture.id;
  state.matchName = fixture.title;
  state.matchDate = fixture.date;
  state.securityLevel = fixture.securityLevel;
  state.matchBroadcast = getMatchBroadcastStatus(fixture.date);

  const pct =
    state.totalCapacity > 0
      ? state.totalOccupancy / state.totalCapacity
      : 0;
  const floor = occupancyFloorForSecurity(fixture.securityLevel, state.matchPhase);
  const needsOccupancy =
    prevId !== fixture.id ||
    prevLevel !== fixture.securityLevel ||
    (fixture.securityLevel === "high" && pct < floor);

  if (needsOccupancy) {
    applyOccupancyToZones(state.zones, state.matchPhase, fixture.securityLevel);
    state.totalOccupancy = state.zones.reduce((s, z) => s + z.occupancy, 0);
  }
}

export const SECURITY_LEVEL_LABEL: Record<SecurityLevel, string> = {
  low: "Low security",
  standard: "Standard security",
  high: "High security",
};

export function securityLevelRiskBias(level: SecurityLevel): number {
  if (level === "high") return 12;
  if (level === "low") return -8;
  return 0;
}
