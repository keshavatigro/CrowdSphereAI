"use client";

import { getStadiumProfile } from "@/lib/stadium-profile";
import { PHASE_LABEL } from "@/lib/match-phase-profiles";
import {
  getActiveFixture,
  getDisplaySecurityLevel,
  SECURITY_LEVEL_LABEL,
} from "@/lib/ipl-fixtures";
import { getMatchBroadcastStatus } from "@/lib/match-broadcast";
import { ui } from "@/lib/theme";
import type { StadiumState } from "@/lib/types";
import { MatchBroadcastBadge } from "./MatchBroadcastBadge";

interface MatchEventAnalyticsProps {
  state: StadiumState;
}

export function MatchEventAnalytics({ state }: MatchEventAnalyticsProps) {
  const profile = getStadiumProfile();
  const fixture = getActiveFixture(state);
  const securityLevel = getDisplaySecurityLevel(state);
  const maxAtt = Math.max(...profile.recentMatches.map((m) => m.attendance));
  const occupancyPct = Math.round(
    (state.totalOccupancy / state.totalCapacity) * 100,
  );
  const capacityVsExpected = fixture
    ? Math.round((state.totalOccupancy / fixture.expectedAttendance) * 100)
    : occupancyPct;
  const broadcast = getMatchBroadcastStatus(state.matchDate);
  const isLiveToday = broadcast === "live";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`p-4 ${ui.panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={ui.h3}>
            {isLiveToday ? "Today's match" : "Selected fixture"}
          </h3>
          <MatchBroadcastBadge matchDate={state.matchDate} size="md" />
        </div>
        <p className={`mt-2 text-2xl font-semibold ${ui.accentOrange}`}>
          {state.matchName}
        </p>
        <p className={`text-sm ${ui.muted}`}>
          {state.matchDate} · {fixture?.competition ?? "IPL 2026"} ·{" "}
          {PHASE_LABEL[state.matchPhase]}
        </p>
        <p className={`mt-1 text-xs ${ui.label}`}>
          {SECURITY_LEVEL_LABEL[securityLevel]}
          {fixture
            ? ` · Est. attendance ${fixture.expectedAttendance.toLocaleString()}`
            : ""}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
        <p className={`mt-1 text-xs ${ui.label}`}>
          {isLiveToday ? "Live" : "Recorded"}{" "}
          {occupancyPct}% stadium occupancy ({state.totalOccupancy.toLocaleString()}{" "}
          fans)
          {fixture
            ? securityLevel === "high"
              ? ` · sell-out target ~${Math.round((fixture.expectedAttendance / state.totalCapacity) * 100)}% capacity`
              : ` · ${capacityVsExpected}% of expected turnout`
            : ""}
        </p>
        {!isLiveToday && (
          <p className={`mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-500 dark:bg-slate-800/50 ${ui.muted}`}>
            This fixture is not scheduled for today — dashboard telemetry reflects
            an offline replay snapshot, not a live broadcast.
          </p>
        )}
      </div>

      <div className={`p-4 ${ui.panel}`}>
        <h3 className={ui.h3}>Attendance trend (recent)</h3>
        <ul className="mt-3 space-y-2">
          {profile.recentMatches.slice(0, 5).map((m) => (
            <li key={m.title + m.date} className="flex items-center gap-3 text-xs">
              <span className={`w-20 shrink-0 truncate font-medium ${ui.body}`}>
                {m.title}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${
                    m.securityIncidents > 0 ? "bg-amber-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${(m.attendance / maxAtt) * 100}%` }}
                />
              </div>
              <span className={`w-12 text-right tabular-nums font-medium ${ui.muted}`}>
                {(m.attendance / 1000).toFixed(1)}k
              </span>
              {m.securityIncidents > 0 && (
                <span className="text-red-600 dark:text-red-400" title="Security incidents">
                  ⚠
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={`p-4 lg:col-span-2 ${ui.panel}`}>
        <h3 className={ui.h3}>Event mix</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="IPL" value={profile.stats.iplMatches} />
          <MiniStat label="International" value={profile.stats.internationalMatches} />
          <MiniStat label="Other events" value={profile.stats.otherEvents} />
          <MiniStat
            label="Matches w/ incidents"
            value={profile.recentMatches.filter((m) => m.securityIncidents > 0).length}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`px-3 py-2 text-center ${highlight ? ui.statHighlight : ui.stat}`}>
      <p
        className={`text-xl font-bold tabular-nums ${
          highlight ? "text-amber-700 dark:text-amber-300" : ui.heading
        }`}
      >
        {value}
      </p>
      <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wide ${ui.label}`}>
        {label}
      </p>
    </div>
  );
}
