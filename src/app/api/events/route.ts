import { NextRequest } from "next/server";
import { subscribe } from "@/lib/broadcast";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      send({ type: "state", payload: getStore().getState() });

      const unsubscribe = subscribe((event) => send(event));

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      const simulation = setInterval(() => {
        const state = getStore().tickSimulation();
        send({ type: "state", payload: state });
      }, 4000);

      const close = () => {
        clearInterval(heartbeat);
        clearInterval(simulation);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
