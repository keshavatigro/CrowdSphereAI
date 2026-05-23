import { NextRequest } from "next/server";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { analyzeStadiumWithGemini } from "@/lib/gemini";
import { matchUpdateSchema } from "@/lib/schemas";
import { getStore } from "@/lib/store";

export async function PATCH(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = matchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const store = getStore();
  if (parsed.data.fixtureId) {
    try {
      store.setMatchFixture(parsed.data.fixtureId);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Invalid fixture", 400);
    }
  }
  if (parsed.data.phase) {
    store.setMatchPhase(parsed.data.phase);
  }

  const insight = await analyzeStadiumWithGemini(store.getState());
  const state = store.setInsight(insight);
  return jsonOk({ state, insight });
}
