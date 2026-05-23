import type { Gate, Zone } from "./types";

export const APP_NAME = "CrowdSphere AI";
export const LOGO_PATH = "/logo1.png";
/** Intrinsic size for Next/Image (Logo1.png — horizontal wordmark) */
export const CROWDSPHERE_LOGO_WIDTH = 1280;
export const CROWDSPHERE_LOGO_HEIGHT = 320;
export const STADIUM_LOGO_PATH = "/rgis-logo.png";
export const STADIUM_NAME =
  "Rajiv Gandhi International Cricket Stadium, Hyderabad, Telangana";
import { DEFAULT_FIXTURE } from "./ipl-fixtures";

export const MATCH_NAME = DEFAULT_FIXTURE.title;
/** Default fixture date (live when this matches the local calendar day) */
export const MATCH_DATE = DEFAULT_FIXTURE.date;

export const INITIAL_ZONES: Omit<Zone, "occupancy" | "status" | "flowRatePerMin" | "recommendedDirection" | "lastUpdated">[] = [
  { id: "north-stand", name: "North Stand", gateIds: ["G1", "G2"], capacity: 12000 },
  { id: "south-stand", name: "South Stand", gateIds: ["G3", "G4"], capacity: 12000 },
  { id: "east-terrace", name: "East Terrace", gateIds: ["G5"], capacity: 8000 },
  { id: "west-terrace", name: "West Terrace", gateIds: ["G6"], capacity: 8000 },
  { id: "vip-pavilion", name: "VIP Pavilion", gateIds: ["G7"], capacity: 2000 },
  { id: "food-court", name: "Concourse & Food Court", gateIds: ["G8", "G9"], capacity: 6000 },
  { id: "parking-a", name: "Parking Zone A", gateIds: ["P1"], capacity: 5000 },
  { id: "parking-b", name: "Parking Zone B", gateIds: ["P2"], capacity: 5000 },
];

export const INITIAL_GATES: Omit<Gate, "ticketsScanned" | "queueLength" | "isOpen">[] = [
  { id: "G1", name: "Gate 1 — North A", zoneId: "north-stand" },
  { id: "G2", name: "Gate 2 — North B", zoneId: "north-stand" },
  { id: "G3", name: "Gate 3 — South A", zoneId: "south-stand" },
  { id: "G4", name: "Gate 4 — South B", zoneId: "south-stand" },
  { id: "G5", name: "Gate 5 — East", zoneId: "east-terrace" },
  { id: "G6", name: "Gate 6 — West", zoneId: "west-terrace" },
  { id: "G7", name: "Gate 7 — VIP", zoneId: "vip-pavilion" },
  { id: "G8", name: "Gate 8 — Concourse North", zoneId: "food-court" },
  { id: "G9", name: "Gate 9 — Concourse South", zoneId: "food-court" },
];

export const VALID_SECTIONS = [
  "N-A", "N-B", "S-A", "S-B", "E", "W", "VIP", "FC",
] as const;
