import { getBlueprint, findNearestSecureExit } from "./blueprint";
import { generateEmergencyPlaybook } from "./gemini";
import { searchSops } from "./sop-rag";
import { getStore } from "./store";
import type {
  EmergencySeverity,
  EmergencyType,
  RoutingAction,
  StadiumState,
  VisionAlert,
} from "./types";

export const COPILOT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_stadium_status",
      description: "Get full live stadium state: zones, gates, incidents, match phase",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_gate_status",
      description: "Get ticket scan rate, queue length, and open/closed for a gate",
      parameters: {
        type: "object",
        properties: {
          gateId: { type: "string", description: "e.g. G3" },
        },
        required: ["gateId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "apply_crowd_routing",
      description: "Apply ingress/egress/hold routing to zones",
      parameters: {
        type: "object",
        properties: {
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                zoneId: { type: "string" },
                direction: { type: "string", enum: ["in", "out", "hold"] },
                reason: { type: "string" },
                priority: { type: "number" },
              },
              required: ["zoneId", "direction", "reason", "priority"],
            },
          },
        },
        required: ["actions"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "trigger_emergency",
      description: "Trigger emergency protocol for zones",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "medical",
              "security",
              "weather",
              "fire",
              "crowd_crush",
              "evacuation",
            ],
          },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          zoneIds: { type: "array", items: { type: "string" } },
          message: { type: "string" },
        },
        required: ["type", "severity", "zoneIds", "message"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_shelter_protocol",
      description:
        "Lightning/severe weather: close open-air zones, hold ingress, update signage",
      parameters: {
        type: "object",
        properties: {
          zoneIds: {
            type: "array",
            items: { type: "string" },
            description: "Open-air or affected zones",
          },
        },
        required: ["zoneIds"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_fan_notification",
      description: "Draft and publish a short fan push/SMS/signage message",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string" },
          targetZones: { type: "array", items: { type: "string" } },
        },
        required: ["message", "targetZones"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_nearest_secure_exit",
      description: "Blueprint lookup: nearest secure exit for a sector",
      parameters: {
        type: "object",
        properties: {
          sectorId: { type: "string", description: "e.g. sector-4" },
        },
        required: ["sectorId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_emergency_sop",
      description: "RAG search stadium SOP manuals for crisis protocols",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_digital_signage",
      description: "Set digital signage message for zones",
      parameters: {
        type: "object",
        properties: {
          zoneId: { type: "string" },
          message: { type: "string" },
        },
        required: ["zoneId", "message"],
        additionalProperties: false,
      },
    },
  },
];

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: string; state: StadiumState }> {
  const store = getStore();

  switch (name) {
    case "get_stadium_status": {
      const state = store.getState();
      return {
        result: JSON.stringify({
          match: `${state.matchName} · ${state.matchDate}`,
          phase: state.matchPhase,
          weather: state.weather,
          occupancyPct: Math.round(
            (state.totalOccupancy / state.totalCapacity) * 100,
          ),
          zones: state.zones.map((z) => ({
            id: z.id,
            name: z.name,
            status: z.status,
            occupancy: z.occupancy,
            capacity: z.capacity,
            direction: z.recommendedDirection,
          })),
          incidents: state.activeIncidents.length,
          visionAlerts: state.visionAlerts.length,
        }),
        state,
      };
    }

    case "get_gate_status": {
      const gateId = String(args.gateId);
      const gate = store.getState().gates.find((g) => g.id === gateId);
      if (!gate) return { result: JSON.stringify({ error: "Gate not found" }), state: store.getState() };
      return {
        result: JSON.stringify(gate),
        state: store.getState(),
      };
    }

    case "apply_crowd_routing": {
      const actions = args.actions as RoutingAction[];
      const state = store.applyRouting(actions);
      return { result: JSON.stringify({ applied: actions.length, ok: true }), state };
    }

    case "trigger_emergency": {
      const type = args.type as EmergencyType;
      const severity = args.severity as EmergencySeverity;
      const zoneIds = args.zoneIds as string[];
      const message = String(args.message);
      const current = store.getState();
      const zoneNames = current.zones
        .filter((z) => zoneIds.includes(z.id))
        .map((z) => z.name);
      const playbook = await generateEmergencyPlaybook(
        type,
        severity,
        zoneNames,
        message,
      );
      const incident = store.triggerEmergency(
        type,
        severity,
        zoneIds,
        message,
        playbook,
      );
      return {
        result: JSON.stringify({ incidentId: incident.id, status: "active" }),
        state: store.getState(),
      };
    }

    case "execute_shelter_protocol": {
      const zoneIds = (args.zoneIds as string[]) ?? getBlueprint().openAirZones;
      const state = store.executeShelterProtocol(zoneIds);
      return {
        result: JSON.stringify({
          protocol: "shelter",
          zonesAffected: zoneIds,
          signageUpdated: true,
        }),
        state,
      };
    }

    case "draft_fan_notification": {
      const message = String(args.message);
      const targetZones = args.targetZones as string[];
      const { notification, state } = store.publishFanNotification(
        message,
        targetZones,
      );
      return {
        result: JSON.stringify(notification),
        state,
      };
    }

    case "find_nearest_secure_exit": {
      const sectorId = String(args.sectorId);
      const exit = findNearestSecureExit(sectorId);
      return {
        result: JSON.stringify({ sectorId, nearestSecureExit: exit }),
        state: store.getState(),
      };
    }

    case "search_emergency_sop": {
      const query = String(args.query);
      const text = await searchSops(query);
      return { result: text, state: store.getState() };
    }

    case "update_digital_signage": {
      const zoneId = String(args.zoneId);
      const message = String(args.message);
      const state = store.setSignage(zoneId, message);
      return { result: JSON.stringify({ zoneId, message }), state };
    }

    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${name}` }), state: store.getState() };
  }
}

export function visionAlertToJson(alert: VisionAlert): string {
  return JSON.stringify({
    event: alert.event,
    location: alert.location,
    zoneId: alert.zoneId,
    severity: alert.severity,
    densityScore: alert.densityScore,
    summary: alert.analysis.summary,
    anomalies: alert.analysis.anomalies,
  });
}
