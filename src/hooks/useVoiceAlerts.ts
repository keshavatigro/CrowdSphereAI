"use client";

import { useEffect, useRef, useState } from "react";
import { detectVoiceAlerts } from "@/lib/alert-detector";
import {
  cancelSpeech,
  isVoiceAlertsEnabled,
  primeVoiceAlerts,
  setVoiceAlertsEnabled,
  speakAlert,
} from "@/lib/voice-alerts";
import type { StadiumState } from "@/lib/types";

const COOLDOWN_MS = 45_000;

export function useVoiceAlerts(state: StadiumState | null) {
  const prevRef = useRef<StadiumState | null>(null);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const [enabled, setEnabled] = useState(
    () => typeof window !== "undefined" && isVoiceAlertsEnabled(),
  );
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);

  useEffect(() => {
    primeVoiceAlerts();
  }, []);

  useEffect(() => {
    if (!state) return;

    if (state.matchBroadcast !== "live") {
      cancelSpeech();
      prevRef.current = state;
      return;
    }

    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = state;
      return;
    }

    if (!isVoiceAlertsEnabled()) {
      prevRef.current = state;
      return;
    }

    const messages = detectVoiceAlerts(prev, state);
    const now = Date.now();

    for (const alert of messages) {
      const last = cooldownRef.current.get(alert.id) ?? 0;
      if (now - last < COOLDOWN_MS) continue;

      cooldownRef.current.set(alert.id, now);
      speakAlert(alert.text);
      setLastSpoken(alert.text);
      break;
    }

    prevRef.current = state;
  }, [state]);

  function toggle(enabledNext: boolean) {
    setVoiceAlertsEnabled(enabledNext);
    setEnabled(enabledNext);
    if (enabledNext) {
      primeVoiceAlerts();
      speakAlert(
        "Voice alerts enabled. You will hear warnings and recommended actions for live match events.",
      );
    } else {
      cancelSpeech();
      setLastSpoken(null);
    }
  }

  return { enabled, toggle, lastSpoken };
}
