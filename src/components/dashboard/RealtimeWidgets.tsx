"use client";

import { MATCH_BROADCAST_LABEL, getMatchBroadcastStatus } from "@/lib/match-broadcast";
import { PHASE_LABEL } from "@/lib/match-phase-profiles";
import { ui } from "@/lib/theme";
import type { StadiumState } from "@/lib/types";

interface RealtimeWidgetsProps {
  state: StadiumState;
}

export function RealtimeWidgets({ state }: RealtimeWidgetsProps) {
  const occupancyPct = Math.round(
    (state.totalOccupancy / state.totalCapacity) * 100,
  );
  const critical = state.zones.filter((z) => z.status === "critical").length;
  const elevated = state.zones.filter((z) => z.status === "elevated").length;
  const openGates = state.gates.filter((g) => g.isOpen).length;
  const maxQueue = Math.max(...state.gates.map((g) => g.queueLength), 0);
  const visionHigh = state.visionAlerts.filter((a) => a.severity === "high").length;
  const broadcast = getMatchBroadcastStatus(state.matchDate);

  const widgets = [
    {
      label: "Occupancy",
      value: `${occupancyPct}%`,
      sub: `${MATCH_BROADCAST_LABEL[broadcast]} · ${state.totalOccupancy.toLocaleString()} / ${state.totalCapacity.toLocaleString()}`,
      tone:
        occupancyPct >= 85
          ? "text-red-600 dark:text-red-400"
          : occupancyPct >= 70
            ? "text-amber-700 dark:text-amber-400"
            : "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Zone status",
      value: `${critical} / ${elevated}`,
      sub: "Critical / elevated",
      tone:
        critical > 0
          ? "text-red-600 dark:text-red-400"
          : "text-slate-800 dark:text-slate-200",
    },
    {
      label: "Gates open",
      value: `${openGates}/${state.gates.length}`,
      sub: `Peak queue: ${maxQueue}`,
      tone:
        openGates < state.gates.length
          ? "text-amber-700 dark:text-amber-400"
          : "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Emergencies",
      value: String(state.activeIncidents.length),
      sub: PHASE_LABEL[state.matchPhase],
      tone:
        state.activeIncidents.length > 0
          ? "text-red-600 dark:text-red-400"
          : "text-slate-800 dark:text-slate-200",
    },
    {
      label: "Vision alerts",
      value: String(state.visionAlerts.length),
      sub: `${visionHigh} high severity`,
      tone:
        visionHigh > 0
          ? "text-violet-700 dark:text-violet-400"
          : "text-slate-800 dark:text-slate-200",
    },
    {
      label: "Fan pushes",
      value: String(state.fanNotifications.length),
      sub: "Last 30 broadcasts",
      tone: "text-sky-700 dark:text-sky-400",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {widgets.map((w) => (
        <div key={w.label} className={`px-4 py-3 ${ui.panel}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${ui.label}`}>
            {w.label}
          </p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${w.tone}`}>{w.value}</p>
          <p className={`mt-0.5 text-xs ${ui.muted}`}>{w.sub}</p>
        </div>
      ))}
    </div>
  );
}
