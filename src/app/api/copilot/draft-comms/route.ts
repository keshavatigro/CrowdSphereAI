import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, withSecurity } from "@/lib/api";
import { draftFanCommsWithOpenAI } from "@/lib/openai-copilot";

const schema = z.object({
  prompt: z.string().min(5).max(1000),
});

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

  const draft = await draftFanCommsWithOpenAI(parsed.data.prompt);
  return jsonOk({ draft });
}
