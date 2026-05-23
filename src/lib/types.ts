export type ZoneStatus = "normal" | "elevated" | "critical" | "closed";
export type MatchPhase = "pre_match" | "in_play" | "post_match";
export type SecurityLevel = "low" | "standard" | "high";
export type MatchBroadcastStatus = "live" | "offline";
export type EmergencySeverity = "low" | "medium" | "high" | "critical";
export type EmergencyType =
  | "medical"
  | "security"
  | "weather"
  | "fire"
  | "crowd_crush"
  | "evacuation";

export interface Zone {
  id: string;
  name: string;
  gateIds: string[];
  capacity: number;
  occupancy: number;
  status: ZoneStatus;
  flowRatePerMin: number;
  recommendedDirection: "in" | "out" | "hold";
  lastUpdated: string;
}

export interface Gate {
  id: string;
  name: string;
  zoneId: string;
  ticketsScanned: number;
  queueLength: number;
  isOpen: boolean;
}

export interface TicketEvent {
  id: string;
  gateId: string;
  section: string;
  seat: string;
  timestamp: string;
  valid: boolean;
}

export interface RoutingAction {
  zoneId: string;
  direction: "in" | "out" | "hold";
  reason: string;
  priority: number;
}

export interface EmergencyIncident {
  id: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  zoneIds: string[];
  message: string;
  status: "active" | "resolved";
  playbook: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface AIInsight {
  summary: string;
  riskScore: number;
  routingActions: RoutingAction[];
  emergencyRecommendations: string[];
  generatedAt: string;
  source: "gemini" | "rules";
  /** Match phase when this insight was generated */
  matchPhase: MatchPhase;
}

export interface VisionAnalysis {
  location: string;
  densityScore: number;
  anomalies: string[];
  panicIndicators: boolean;
  altercationDetected: boolean;
  unattendedBags: boolean;
  severity: "low" | "medium" | "high";
  summary: string;
  recommendedZoneAction: "in" | "out" | "hold" | null;
  source: "gemini" | "rules";
  analyzedAt: string;
}

export interface VisionAlert {
  id: string;
  zoneId: string;
  location: string;
  event: "surge" | "anomaly" | "normal";
  severity: "low" | "medium" | "high";
  densityScore: number;
  analysis: VisionAnalysis;
  createdAt: string;
}

export interface FanNotification {
  id: string;
  message: string;
  targetZones: string[];
  createdAt: string;
}

export interface StadiumState {
  matchId: string;
  matchName: string;
  matchDate: string;
  /** Live when matchDate is today; otherwise offline */
  matchBroadcast: MatchBroadcastStatus;
  securityLevel: SecurityLevel;
  matchPhase: MatchPhase;
  weather: string;
  totalCapacity: number;
  totalOccupancy: number;
  zones: Zone[];
  gates: Gate[];
  recentTickets: TicketEvent[];
  activeIncidents: EmergencyIncident[];
  lastInsight?: AIInsight;
  visionAlerts: VisionAlert[];
  fanNotifications: FanNotification[];
  signageMessages: Record<string, string>;
  updatedAt: string;
}

export interface BroadcastEvent {
  type:
    | "state"
    | "ticket"
    | "routing"
    | "emergency"
    | "insight"
    | "vision"
    | "notification";
  payload: unknown;
  timestamp: string;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export interface CopilotResponse {
  reply: string;
  toolCalls: CopilotToolCall[];
  state: StadiumState;
  pendingApproval?: {
    message: string;
    actions: Array<{ tool: string; args: Record<string, unknown> }>;
  };
}
