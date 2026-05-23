import OpenAI from "openai";
import { getBlueprintContext } from "./blueprint";
import {
  COPILOT_TOOLS,
  executeAgentTool,
  visionAlertToJson,
} from "./agent-tools";
import { getStore } from "./store";
import type { CopilotMessage, CopilotResponse, VisionAlert } from "./types";

const MODEL = "gpt-4o";

function rulesCopilotReply(userMessage: string): string {
  const state = getStore().getState();
  const gateMatch = userMessage.match(/gate\s*(\d+|g\d+)/i);
  if (gateMatch) {
    const id = gateMatch[1]!.toUpperCase().startsWith("G")
      ? gateMatch[1]!.toUpperCase()
      : `G${gateMatch[1]}`;
    const gate = state.gates.find((g) => g.id === id);
    if (gate) {
      return `Gate ${gate.id} (${gate.name}): queue ${gate.queueLength}, scanned ${gate.ticketsScanned}, ${gate.isOpen ? "open" : "closed"}.`;
    }
  }
  return `CrowdSphere Command Copilot (offline): occupancy ${Math.round((state.totalOccupancy / state.totalCapacity) * 100)}%, ${state.activeIncidents.length} active incidents. Set OPENAI_API_KEY for full GPT-4o tool use.`;
}

export async function runCopilotChat(
  messages: CopilotMessage[],
  visionAlert?: VisionAlert,
): Promise<CopilotResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const store = getStore();
  let state = store.getState();

  if (!apiKey) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return {
      reply: rulesCopilotReply(lastUser?.content ?? ""),
      toolCalls: [],
      state,
    };
  }

  const openai = new OpenAI({ apiKey });
  const blueprint = getBlueprintContext();

  const system = `You are the CrowdSphere AI Command Copilot for ${state.matchName} at ${state.matchDate}.
Stadium: Rajiv Gandhi International Cricket Stadium, Hyderabad.
You help operators monitor gates, route crowds, run emergencies, draft fan comms, and execute shelter protocols.

Stadium blueprint (spatial awareness):
${blueprint}

When Gemini vision sends a surge alert, summarize for the operator and propose concrete actions (reroute gates, deploy security, draft notification). Use tools to execute when the operator confirms or when urgency is critical (lightning within 3 miles).

Be concise, conversational, and safety-first.`;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  if (visionAlert) {
    openaiMessages.push({
      role: "user",
      content: `[GEMINI VISION ALERT]\n${visionAlertToJson(visionAlert)}\nOperator needs guidance and optional automated response.`,
    });
  }

  const toolCallsLog: CopilotResponse["toolCalls"] = [];
  let reply = "";
  let iterations = 0;

  while (iterations < 6) {
    iterations += 1;
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: openaiMessages,
      tools: COPILOT_TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    if (choice.content) {
      reply = choice.content;
    }

    if (!choice.tool_calls?.length) {
      openaiMessages.push({ role: "assistant", content: reply });
      break;
    }

    openaiMessages.push({
      role: "assistant",
      content: choice.content ?? null,
      tool_calls: choice.tool_calls,
    });

    for (const tc of choice.tool_calls) {
      if (tc.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }
      const { result, state: newState } = await executeAgentTool(
        tc.function.name,
        args,
      );
      state = newState;
      toolCallsLog.push({
        name: tc.function.name,
        arguments: args,
        result,
      });
      openaiMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
  }

  if (!reply && toolCallsLog.length) {
    reply = `Executed ${toolCallsLog.length} action(s). Check dashboard for updates.`;
  }

  return { reply, toolCalls: toolCallsLog, state };
}

export async function draftFanCommsWithOpenAI(
  prompt: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "Please use Gate 5 instead of Gate 4 — shorter lines, free water at entry.";
  }

  const openai = new OpenAI({ apiKey });
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Draft friendly stadium fan push notifications. Max 20 words unless asked otherwise.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
