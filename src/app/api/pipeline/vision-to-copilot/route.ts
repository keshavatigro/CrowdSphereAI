import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { runCopilotChat } from "@/lib/openai-copilot";
import { z } from "zod";
import { getStore } from "@/lib/store";

const schema = z.object({
  visionAlertId: z.string().uuid(),
});

/** Step 2→4: Gemini alert routed to OpenAI Command Copilot */
export async function POST(request: NextRequest) {
  const denied = withSecurity(request, { ai: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const alert = getStore()
    .getState()
    .visionAlerts.find((a) => a.id === parsed.data.visionAlertId);

  if (!alert) {
    return jsonError("Vision alert not found", 404);
  }

  const response = await runCopilotChat(
    [
      {
        role: "user",
        content:
          "Vision detected a crowd event. Recommend reroute and security deployment. Ask if I should execute.",
      },
    ],
    alert,
  );

  return jsonOk({ alert, copilot: response });
}
