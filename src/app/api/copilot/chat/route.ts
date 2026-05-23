import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { runCopilotChat } from "@/lib/openai-copilot";
import { copilotChatSchema } from "@/lib/schemas";
import { getStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const denied = withSecurity(request, { ai: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = copilotChatSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const state = getStore().getState();
  const visionAlert = parsed.data.visionAlertId
    ? state.visionAlerts.find((a) => a.id === parsed.data.visionAlertId)
    : undefined;

  const response = await runCopilotChat(parsed.data.messages, visionAlert);

  return jsonOk(response);
}
