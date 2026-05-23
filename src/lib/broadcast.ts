import type { BroadcastEvent } from "./types";

type Listener = (event: BroadcastEvent) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcast(event: Omit<BroadcastEvent, "timestamp">): void {
  const full: BroadcastEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  for (const listener of listeners) {
    listener(full);
  }
}
