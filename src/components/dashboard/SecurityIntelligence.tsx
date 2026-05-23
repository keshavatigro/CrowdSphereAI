"use client";

import {
  getActiveFixture,
  getDisplaySecurityLevel,
  IPL_FIXTURES,
  SECURITY_LEVEL_LABEL,
} from "@/lib/ipl-fixtures";
import { getStadiumProfile, mergeLiveGateStatus } from "@/lib/stadium-profile";
import { ui } from "@/lib/theme";
import type { SecurityLevel, StadiumState } from "@/lib/types";

interface SecurityIntelligenceProps {
  state: StadiumState;
}

const levelPanel: Record<SecurityLevel, string> = {
  low: "border-emerald-300 bg-emerald-50 dark:border-emerald-400/55 dark:bg-emerald-950/25",
  standard:
    "border-sky-300 bg-sky-50 dark:border-sky-400/55 dark:bg-sky-950/25",
  high: "border-red-300 bg-red-50 dark:border-red-400/55 dark:bg-red-950/25",
};

export function SecurityIntelligence({ state }: SecurityIntelligenceProps) {
  const profile = getStadiumProfile();
  const fixture = getActiveFixture(state);
  const securityLevel = getDisplaySecurityLevel(state);
  const gates = mergeLiveGateStatus(state.gates);
  const hotGates = gates
    .filter((g) => g.historicalIncidents > 0 || g.queueLength > 100)
    .sort((a, b) => b.historicalIncidents - a.historicalIncidents);

  const highSecurityFixtures = IPL_FIXTURES.filter(
    (f) => f.securityLevel === "high",
  );
  const lowSecurityFixtures = IPL_FIXTURES.filter(
    (f) => f.securityLevel === "low",
  );

  return (
    <div className="space-y-4">
      {fixture && (
        <div
          className={`rounded-xl border p-4 ${levelPanel[state.securityLevel]}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Selected fixture
              </p>
              <p className={`mt-1 text-lg font-semibold ${ui.heading}`}>
                {fixture.title}
              </p>
              <p className={`text-sm ${ui.muted}`}>
                {fixture.date} · {fixture.competition}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                securityLevel === "high"
                  ? "bg-red-600 text-white"
                  : securityLevel === "low"
                    ? "bg-emerald-600 text-white"
                    : "bg-sky-600 text-white"
              }`}
            >
              {SECURITY_LEVEL_LABEL[securityLevel]}
            </span>
          </div>
          <p className={`mt-3 text-sm ${ui.body}`}>{fixture.notes}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className={ui.label}>Stewards</dt>
              <dd className={`font-semibold tabular-nums ${ui.heading}`}>
                {fixture.stewardCount}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>K9 units</dt>
              <dd className={`font-semibold tabular-nums ${ui.heading}`}>
                {fixture.k9Units}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Bag checks</dt>
              <dd className={`font-semibold capitalize ${ui.heading}`}>
                {fixture.bagCheckMode}
              </dd>
            </div>
            <div>
              <dt className={ui.label}>Prior incidents</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  fixture.historicalIncidents > 0 ? ui.warn : ui.heading
                }`}
              >
                {fixture.historicalIncidents}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className={ui.h3Red}>Incident history by gate</h3>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {hotGates.map((g) => (
              <div key={g.id} className={`px-3 py-2 ${ui.panelInset}`}>
                <div className="flex justify-between text-sm">
                  <span className={`font-semibold ${ui.heading}`}>{g.id}</span>
                  <span className={ui.muted}>Q: {g.queueLength}</span>
                </div>
                <p className={`text-xs ${ui.label}`}>{g.name}</p>
                <p className={`mt-1 text-xs ${ui.warn}`}>
                  {g.historicalIncidents} historical ·{" "}
                  {g.lastIncident ?? "No recent pattern"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className={ui.h3Red}>IPL fixtures by security tier</h3>
          <div className="mt-3 space-y-3">
            <div>
              <p className={`text-xs font-semibold uppercase ${ui.h3Red}`}>
                High security ({highSecurityFixtures.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {highSecurityFixtures.map((m) => (
                  <li
                    key={m.id}
                    className={`px-3 py-2 text-sm ${
                      m.id === fixture.id ? ui.panelRed : ui.panelInset
                    }`}
                  >
                    <span className={`font-semibold ${ui.heading}`}>
                      {m.title}
                    </span>
                    <span className={ui.muted}> · {m.date}</span>
                    <p className={`mt-0.5 text-xs ${ui.body}`}>
                      {m.historicalIncidents} prior incident(s) ·{" "}
                      {m.stewardCount} stewards · {m.k9Units} K9
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400`}>
                Low security ({lowSecurityFixtures.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {lowSecurityFixtures.map((m) => (
                  <li
                    key={m.id}
                    className={`px-3 py-2 text-sm ${
                      m.id === fixture.id ? ui.panelInset : ui.panelInset
                    }`}
                  >
                    <span className={`font-semibold ${ui.heading}`}>
                      {m.title}
                    </span>
                    <span className={ui.muted}> · {m.date}</span>
                    <p className={`mt-0.5 text-xs ${ui.body}`}>
                      Sampled bag checks · {m.stewardCount} stewards
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h3 className={`mt-4 ${ui.h3}`}>Live security posture</h3>
          <ul className={`mt-2 space-y-1 text-xs ${ui.body}`}>
            <li>Active emergencies: {state.activeIncidents.length}</li>
            <li>Vision alerts (session): {state.visionAlerts.length}</li>
            <li>
              Closed gates:{" "}
              {state.gates.filter((g) => !g.isOpen).map((g) => g.id).join(", ") ||
                "None"}
            </li>
            <li>
              Stadium history:{" "}
              {profile.recentMatches.filter((m) => m.securityIncidents > 0).length}{" "}
              past matches with incidents
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
