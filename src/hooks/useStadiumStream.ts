"use client";

import { useCallback, useEffect, useState } from "react";
import { syncFixtureMetadata } from "@/lib/ipl-fixtures";
import type { StadiumState } from "@/lib/types";

function normalizeState(data: StadiumState): StadiumState {
  const next = structuredClone(data);
  syncFixtureMetadata(next);
  return next;
}

export function useStadiumStream() {
  const [state, setState] = useState<StadiumState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state");
    if (res.ok) {
      const data = (await res.json()) as StadiumState;
      setState(normalizeState(data));
    }
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;

    const connect = () => {
      source = new EventSource("/api/events");
      source.onopen = () => {
        setConnected(true);
        setError(null);
      };
      source.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as {
            type: string;
            payload: StadiumState;
          };
          if (msg.type === "state" && msg.payload?.zones) {
            setState(normalizeState(msg.payload));
          }
        } catch {
          /* ignore malformed */
        }
      };
      source.onerror = () => {
        setConnected(false);
        setError("Live feed disconnected — retrying…");
        source?.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => source?.close();
  }, []);

  return { state, connected, error, refresh, setState };
}
