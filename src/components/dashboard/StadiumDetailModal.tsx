"use client";

import Image from "next/image";
import { useState } from "react";
import { isMatchLiveToday } from "@/lib/match-broadcast";
import { getStadiumProfile } from "@/lib/stadium-profile";
import { STADIUM_LOGO } from "./DashboardHeader";
import type { Gate } from "@/lib/types";

type Tab = "about" | "matches" | "security" | "gates" | "prevention";

interface StadiumDetailModalProps {
  open: boolean;
  onClose: () => void;
  liveGates: Gate[];
}

export function StadiumDetailModal({
  open,
  onClose,
  liveGates,
}: StadiumDetailModalProps) {
  const [tab, setTab] = useState<Tab>("about");
  const profile = getStadiumProfile();

  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "about", label: "About & History" },
    { id: "matches", label: "Matches & Events" },
    { id: "security", label: "Security Records" },
    { id: "gates", label: "Gates" },
    { id: "prevention", label: "Prevention" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stadium-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-500 dark:bg-slate-900">
        <div className="relative h-36 shrink-0 bg-gradient-to-br from-sky-950 via-slate-900 to-orange-950/40 sm:h-40">
          <Image
            src={STADIUM_LOGO}
            alt={profile.name}
            width={120}
            height={120}
            className="absolute bottom-4 left-5 rounded-2xl bg-white/95 p-2 shadow-lg ring-2 ring-white/20"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm text-slate-700 shadow hover:text-slate-900 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-white"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-36 right-4 sm:left-40">
            <h2 id="stadium-modal-title" className="text-lg font-semibold text-white">
              {profile.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{profile.location}</p>
          </div>
        </div>

        <div
          className="shrink-0 border-b border-slate-200 dark:border-slate-600"
          role="tablist"
          aria-label="Stadium profile sections"
        >
          <div className="flex gap-0 overflow-x-auto overscroll-x-contain px-2 sm:px-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-medium leading-normal transition-colors sm:px-4 sm:text-sm ${
                  tab === t.id
                    ? "border-sky-500 text-slate-900 dark:border-sky-400 dark:text-white"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-300">
          {tab === "about" && (
            <div className="space-y-4">
              <p className="leading-relaxed">{profile.about}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Capacity" value={profile.capacity.toLocaleString()} />
                <Stat label="Established" value={String(profile.established)} />
                <Stat
                  label="Matches hosted"
                  value={String(profile.stats.totalMatchesHosted)}
                />
                <Stat label="Peak attendance" value={profile.stats.peakAttendance.toLocaleString()} />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">Timeline</h3>
              <ul className="space-y-2 border-l border-slate-700 pl-4">
                {profile.history.map((h) => (
                  <li key={h.year} className="relative">
                    <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-sky-500" />
                    <span className="text-sky-400">{h.year}</span> — {h.event}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "matches" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="IPL matches" value={String(profile.stats.iplMatches)} />
                <Stat label="International" value={String(profile.stats.internationalMatches)} />
                <Stat label="Other events" value={String(profile.stats.otherEvents)} />
                <Stat label="Avg attendance" value={profile.stats.averageAttendance.toLocaleString()} />
              </div>
              <h3 className="font-medium text-white">Recent matches</h3>
              <div className="space-y-2">
                {profile.recentMatches.map((m) => (
                  <div
                    key={m.date + m.title}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-500 dark:bg-slate-800/40"
                  >
                    <div>
                      <p className="font-medium text-white">{m.title}</p>
                      <p className="text-xs text-slate-500">
                        {m.date} · {m.competition}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">
                        {m.attendance.toLocaleString()} fans
                      </span>
                      {m.securityIncidents > 0 ? (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
                          {m.securityIncidents} security issue(s)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                          Clear
                        </span>
                      )}
                      {isMatchLiveToday(m.date) && (
                        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-300">
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="font-medium text-white">Non-match events</h3>
              <ul className="space-y-1 text-xs">
                {profile.events.map((e) => (
                  <li key={e.name} className="flex justify-between rounded bg-slate-800/30 px-2 py-1.5">
                    <span>
                      {e.date} — {e.name}
                    </span>
                    <span className="text-slate-500">
                      {e.incidents > 0 ? `${e.incidents} incident` : "OK"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Historical incidents linked to gates and matches. Use patterns to tune
                live routing.
              </p>
              {profile.securityRecords.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-400/50 dark:bg-red-950/15"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-red-200">{r.type.replace("_", " ")}</span>
                    <span className="text-slate-500">{r.date}</span>
                    <span className="text-slate-400">{r.match}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {r.gate}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 ${
                        r.severity === "high"
                          ? "bg-red-500/30 text-red-200"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-700 dark:text-slate-300">{r.summary}</p>
                </div>
              ))}
            </div>
          )}

          {tab === "gates" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live queue lengths reflect the command center; historical incidents are
                from venue records.
              </p>
              {profile.gates.map((g) => {
                const live = liveGates.find((lg) => lg.id === g.id);
                const incidents = profile.securityRecords.filter(
                  (r) => r.gate === g.id,
                );
                return (
                  <div
                    key={g.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {g.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {g.zone}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        <p
                          className={
                            live?.isOpen
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : "font-medium text-red-600 dark:text-red-400"
                          }
                        >
                          {live?.isOpen !== false ? "Open" : "Closed"}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          Q: {live?.queueLength ?? 0}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                      Typical load: {g.typicalLoad} · CCTV: {g.cctv ? "Yes" : "No"} ·{" "}
                      {incidents.length} past incident(s)
                    </p>
                    {incidents[0] && (
                      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/30 dark:text-amber-200">
                        Last: {incidents[0].summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "prevention" && (
            <div className="space-y-4">
              <p className="text-slate-400">
                Lessons learned from past incidents at RGIS — applied in CrowdSphere
                playbooks.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                {profile.preventionPlaybook.map((step, i) => (
                  <li key={i} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
              <h3 className="font-medium text-white">Per-incident prevention notes</h3>
              <ul className="space-y-2">
                {profile.securityRecords.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-emerald-300 bg-emerald-50 p-2 text-xs dark:border-emerald-400/50 dark:bg-emerald-950/20"
                  >
                    <span className="text-emerald-300">{r.gate}</span> ({r.date}):{" "}
                    {r.prevention}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 px-3 py-2 text-center dark:bg-slate-800/50">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
