import { NextRequest } from "next/server";
import { jsonOk, withSecurity } from "@/lib/api";
import { getStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const denied = withSecurity(request);
  if (denied) return denied;

  return jsonOk(getStore().getState());
}
