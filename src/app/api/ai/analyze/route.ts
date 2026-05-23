import { NextRequest } from "next/server";
import { jsonOk, withSecurity } from "@/lib/api";
import { analyzeStadiumWithGemini } from "@/lib/gemini";
import { getStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const denied = withSecurity(request, { ai: true });
  if (denied) return denied;

  const state = getStore().getState();
  const insight = await analyzeStadiumWithGemini(state);
  const updated = getStore().setInsight(insight);

  return jsonOk({ insight, state: updated });
}
