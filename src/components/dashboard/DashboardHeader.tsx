"use client";

import Image from "next/image";
import { CrowdSphereLogo } from "@/components/CrowdSphereLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ui } from "@/lib/theme";
import { getStadiumProfile } from "@/lib/stadium-profile";
import {
  getActiveFixture,
  IPL_FIXTURES,
  SECURITY_LEVEL_LABEL,
  type IplFixture,
} from "@/lib/ipl-fixtures";
import { STADIUM_NAME } from "@/lib/constants";
import { VoiceAlertsToggle } from "@/components/VoiceAlertsToggle";
import { MatchBroadcastBadge } from "./MatchBroadcastBadge";
import type { MatchBroadcastStatus, MatchPhase } from "@/lib/types";

const STADIUM_LOGO = "/rgis-logo.png";

interface DashboardHeaderProps {
  connected: boolean;
  weather: string;
  matchId: string;
  matchName: string;
  matchDate: string;
  matchPhase: MatchPhase;
  onMatchChange: (fixtureId: string) => void;
  onPhaseChange: (phase: MatchPhase) => void;
  onOpenStadium: () => void;
  error: string | null;
  matchContextLoading?: boolean;
  matchContextMessage?: string;
  voiceAlertsEnabled?: boolean;
  onVoiceAlertsToggle?: (enabled: boolean) => void;
  matchBroadcast?: MatchBroadcastStatus;
}

const NAV = [
  { href: "#realtime", label: "Live" },
  { href: "#analytics", label: "Analytics" },
  { href: "#security", label: "Security" },
  { href: "#risk", label: "AI Risk" },
  { href: "#operations", label: "Operations" },
];

const SECURITY_BADGE: Record<
  IplFixture["securityLevel"],
  string
> = {
  low: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  standard:
    "bg-sky-500/10 text-sky-800 ring-sky-500/25 dark:text-sky-300",
  high: "bg-red-500/10 text-red-800 ring-red-500/25 dark:text-red-300",
};

function fixturesBySecurity(level: IplFixture["securityLevel"]) {
  return IPL_FIXTURES.filter((f) => f.securityLevel === level);
}

export function DashboardHeader({
  connected,
  weather,
  matchId,
  matchName,
  matchDate,
  matchPhase,
  onMatchChange,
  onPhaseChange,
  onOpenStadium,
  error,
  matchContextLoading = false,
  matchContextMessage,
  voiceAlertsEnabled = true,
  onVoiceAlertsToggle,
  matchBroadcast = "offline",
}: DashboardHeaderProps) {
  const profile = getStadiumProfile();
  const activeFixture = getActiveFixture({ matchId, matchName });
  const securityLevel = activeFixture.securityLevel;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl ${ui.header}`}
    >
      {matchContextLoading && (
        <div
          className="h-0.5 overflow-hidden bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuetext={matchContextMessage ?? "Loading match context"}
        >
          <div className="match-context-progress-bar h-full w-1/3 bg-gradient-to-r from-sky-400 via-violet-500 to-sky-400" />
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 w-full">
            <CrowdSphereLogo size="header" priority />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 sm:text-xs dark:text-sky-400">
              Stadium Intelligence Dashboard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            {onVoiceAlertsToggle && (
              <VoiceAlertsToggle
                enabled={voiceAlertsEnabled}
                onToggle={onVoiceAlertsToggle}
                liveMatch={matchBroadcast === "live"}
              />
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}
              />
              {connected ? "Connected" : "Reconnecting"}
            </span>
            <select
              value={matchId}
              onChange={(e) => onMatchChange(e.target.value)}
              disabled={matchContextLoading}
              className={`max-w-[11rem] rounded-lg px-2.5 py-1 text-xs sm:max-w-none disabled:cursor-wait disabled:opacity-60 ${ui.input}`}
              aria-label="Select IPL match"
              aria-busy={matchContextLoading}
            >
              <optgroup label="Low security">
                {fixturesBySecurity("low").map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} · {f.date}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Standard security">
                {fixturesBySecurity("standard").map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} · {f.date}
                  </option>
                ))}
              </optgroup>
              <optgroup label="High security">
                {fixturesBySecurity("high").map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} · {f.date}
                  </option>
                ))}
              </optgroup>
            </select>
            <select
              value={matchPhase}
              onChange={(e) => onPhaseChange(e.target.value as MatchPhase)}
              disabled={matchContextLoading}
              className={`rounded-lg px-2.5 py-1 text-xs disabled:cursor-wait disabled:opacity-60 ${ui.input}`}
              aria-label="Match phase"
              aria-busy={matchContextLoading}
            >
              <option value="pre_match">Pre-match</option>
              <option value="in_play">In play</option>
              <option value="post_match">Post-match</option>
            </select>
          </div>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${ui.navLink}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className={`border-t ${ui.subheader}`}>
        <div
          className={`mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-2 text-xs sm:px-6 ${ui.muted}`}
        >
          <button
            type="button"
            onClick={onOpenStadium}
            className="group inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:hover:bg-slate-800/80"
            title="View stadium profile"
          >
            <Image
              src={STADIUM_LOGO}
              alt=""
              width={28}
              height={28}
              className="rounded-md bg-white p-0.5 ring-1 ring-slate-600/50"
            />
            <span className="text-slate-800 underline-offset-2 group-hover:text-sky-600 group-hover:underline dark:text-slate-200 dark:group-hover:text-sky-300">
              {STADIUM_NAME}
            </span>
            <span className="hidden text-slate-500 sm:inline">
              · {profile.stats.totalMatchesHosted} matches hosted
            </span>
          </button>
          <span className="hidden h-3 w-px bg-slate-700 sm:block" />
          <span className="text-orange-300/90">
            {matchName} · {matchDate}
          </span>
          <MatchBroadcastBadge matchDate={matchDate} />
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${SECURITY_BADGE[securityLevel]}`}
          >
            {SECURITY_LEVEL_LABEL[securityLevel]}
          </span>
          <span className="hidden h-3 w-px bg-slate-700 sm:block" />
          <span>{weather}</span>
        </div>
      </div>

      {error && (
        <p className="mx-auto max-w-7xl px-4 pb-2 text-xs text-amber-400 sm:px-6">
          {error}
        </p>
      )}
    </header>
  );
}

export { STADIUM_LOGO };
