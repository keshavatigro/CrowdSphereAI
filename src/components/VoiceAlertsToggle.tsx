"use client";

import { primeVoiceAlerts } from "@/lib/voice-alerts";

interface VoiceAlertsToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  liveMatch: boolean;
}

export function VoiceAlertsToggle({
  enabled,
  onToggle,
  liveMatch,
}: VoiceAlertsToggleProps) {
  return (
    <button
      type="button"
      onClick={() => {
        primeVoiceAlerts();
        onToggle(!enabled);
      }}
      disabled={!liveMatch}
      title={
        liveMatch
          ? enabled
            ? "Mute voice alerts"
            : "Enable voice alerts for warnings and actions"
          : "Voice alerts only run during a live match (today's fixture)"
      }
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        enabled
          ? "border-violet-400 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-500/50 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/50"
          : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute voice alerts" : "Enable voice alerts"}
    >
      <span aria-hidden>{enabled ? "🔊" : "🔇"}</span>
      Voice {enabled ? "on" : "off"}
    </button>
  );
}
