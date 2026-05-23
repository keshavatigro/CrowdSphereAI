"use client";

import { computeRiskScore } from "@/lib/stadium-profile";
import { ui } from "@/lib/theme";
import type { StadiumState } from "@/lib/types";

interface RiskPredictionPanelProps {
  state: StadiumState;
}

const levelStyles = {
  low: "from-emerald-50 to-white border-emerald-300 text-emerald-900 dark:from-emerald-600/20 dark:to-slate-900 dark:border-emerald-400/55 dark:text-emerald-200",
  moderate:
    "from-amber-50 to-white border-amber-300 text-amber-900 dark:from-amber-600/20 dark:to-slate-900 dark:border-amber-400/55 dark:text-amber-200",
  high: "from-orange-50 to-white border-orange-300 text-orange-900 dark:from-orange-600/20 dark:to-slate-900 dark:border-orange-400/55 dark:text-orange-200",
  critical:
    "from-red-50 to-white border-red-300 text-red-900 dark:from-red-600/30 dark:to-slate-900 dark:border-red-400/60 dark:text-red-200",
};

export function RiskPredictionPanel({ state }: RiskPredictionPanelProps) {
  const risk = computeRiskScore(state);
  const aiInsight = state.lastInsight;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div
        className={`rounded-xl border bg-gradient-to-br p-5 lg:col-span-1 ${levelStyles[risk.level]}`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-90">
          AI risk prediction
        </p>
        <p className="mt-2 text-5xl font-bold tabular-nums">{risk.score}</p>
        <p className="text-sm font-medium capitalize opacity-95">{risk.level} risk</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-300/80 dark:bg-black/30">
          <div
            className="h-full rounded-full bg-current transition-all"
            style={{ width: `${risk.score}%` }}
          />
        </div>
      </div>

      <div className={`p-4 lg:col-span-2 ${ui.panel}`}>
        <h3 className={ui.h3Violet}>Contributing factors</h3>
        <ul className={`mt-2 space-y-1.5 text-sm ${ui.body}`}>
          {risk.factors.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-violet-600 dark:text-violet-400">•</span>
              {f}
            </li>
          ))}
        </ul>

        {aiInsight && (
          <div className={`mt-4 p-3 ${ui.panelViolet}`}>
            <p className={`text-xs font-semibold ${ui.h3Violet}`}>
              Gemini telemetry ({aiInsight.source})
            </p>
            <p className={`mt-1 text-sm ${ui.body}`}>{aiInsight.summary}</p>
            {aiInsight.emergencyRecommendations.length > 0 && (
              <ul className={`mt-2 space-y-0.5 text-xs ${ui.muted}`}>
                {aiInsight.emergencyRecommendations.slice(0, 3).map((r, i) => (
                  <li key={i}>→ {r}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className={`mt-3 text-xs ${ui.muted}`}>
          Run <strong className="text-violet-700 dark:text-violet-400">Gemini telemetry advisor</strong> in
          Operations for updated ML routing recommendations.
        </p>
      </div>
    </div>
  );
}
