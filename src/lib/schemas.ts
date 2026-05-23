import { z } from "zod";

export const ticketScanSchema = z.object({
  gateId: z.string().min(1).max(10),
  section: z.string().min(1).max(10),
  seat: z.string().min(1).max(20),
});

export const routingActionSchema = z.object({
  zoneId: z.string().min(1),
  direction: z.enum(["in", "out", "hold"]),
  reason: z.string().max(500),
  priority: z.coerce.number().int().min(1).max(10).optional().default(5),
});

export const routingSchema = z.object({
  actions: z.array(routingActionSchema).min(1).max(20),
  autoApply: z.boolean().optional(),
});

export const emergencySchema = z.object({
  type: z.enum([
    "medical",
    "security",
    "weather",
    "fire",
    "crowd_crush",
    "evacuation",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  zoneIds: z.array(z.string()).min(1).max(8),
  message: z.string().min(3).max(500),
});

export const matchPhaseSchema = z.object({
  phase: z.enum(["pre_match", "in_play", "post_match"]),
});

export const matchUpdateSchema = z
  .object({
    phase: z.enum(["pre_match", "in_play", "post_match"]).optional(),
    fixtureId: z.string().min(1).max(40).optional(),
  })
  .refine((d) => d.phase !== undefined || d.fixtureId !== undefined, {
    message: "Provide phase and/or fixtureId",
  });

export const resolveEmergencySchema = z.object({
  incidentId: z.string().uuid(),
});

export const visionAnalyzeSchema = z
  .object({
    locationLabel: z.string().min(1).max(120),
    zoneId: z.string().min(1).max(40),
    timeWindowMinutes: z.number().int().min(1).max(30).default(5),
    /** Simulate CCTV analysis from live zone telemetry — no images required */
    demo: z.boolean().optional(),
    images: z
      .array(
        z.object({
          base64: z.string().min(100).max(8_000_000),
          mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        }),
      )
      .max(5)
      .optional(),
  })
  .refine((d) => d.demo === true || (d.images?.length ?? 0) >= 1, {
    message: "Provide demo: true or at least one CCTV image",
  });

export const copilotChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  visionAlertId: z.string().uuid().optional(),
});

export const weatherWebhookSchema = z.object({
  distanceMiles: z.number().min(0).max(50),
  zoneIds: z.array(z.string()).optional(),
});

export const spatialGuidanceSchema = z.object({
  sectorId: z.string(),
  incidentType: z.string().min(1).max(200),
});
