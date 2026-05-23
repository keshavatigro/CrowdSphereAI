"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client";
import { normalizeRoutingActions } from "@/lib/routing";
import { ui } from "@/lib/theme";
import { PHASE_LABEL } from "@/lib/match-phase-profiles";
import type { AIInsight, RoutingAction, StadiumState } from "@/lib/types";

interface AIAdvisorProps {
  state: StadiumState;
  onUpdate: (state: StadiumState) => void;
}

export function AIAdvisor({ state, onUpdate }: AIAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const insight = state.lastInsight;
  const insightStale =
    insight != null && insight.matchPhase !== state.matchPhase;

  async function runAnalysis() {
    setLoading(true);
    setApplyMessage(null);
    try {
      const result = await apiPost<{ insight: AIInsight; state: StadiumState }>(
        "/api/ai/analyze",
        {},
      );
      onUpdate(result.state);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function applyRouting() {
    if (!insight?.routingActions?.length) {
      setApplyMessage("Run analysis first — no routing plan available.");
      return;
    }

    const actions = normalizeRoutingActions(insight.routingActions);
    if (actions.length === 0) {
      setApplyMessage(
        "Could not apply — zone IDs in the plan did not match this stadium.",
      );
      return;
    }

    setLoading(true);
    setApplyMessage(null);
    try {
      const result = await apiPost<{
        state: StadiumState;
        applied: number;
        actions: RoutingAction[];
      }>("/api/crowd", {
        actions,
        autoApply: true,
      });
      onUpdate(result.state);
      setApplyMessage(
        `Applied ${result.applied} routing rule(s). Check the crowd flow map and digital signage below.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Apply failed";
      setApplyMessage(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Working…" : "Run Gemini Crowd Analysis"}
        </button>
        {insight && insight.routingActions.length > 0 && (
          <button
            type="button"
            onClick={applyRouting}
            disabled={loading}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 border-violet-400 text-violet-800 hover:bg-violet-100 dark:border-violet-400 dark:text-violet-100 dark:hover:bg-violet-900/50`}
          >
            {loading ? "Applying…" : "Apply AI Routing Plan"}
          </button>
        )}
      </div>

      {applyMessage && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            applyMessage.startsWith("Applied")
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/55 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/55 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
          role="status"
        >
          {applyMessage}
        </p>
      )}

      {insightStale && (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/55 dark:bg-amber-950/30 dark:text-amber-200"
          role="status"
        >
          Insight is from {PHASE_LABEL[insight!.matchPhase]} — run analysis again
          for {PHASE_LABEL[state.matchPhase]}.
        </p>
      )}

      {!insight ? (
        <p className={`text-sm ${ui.muted}`}>
          Changing match phase refreshes zone telemetry and re-runs the advisor.
          Uses Google GenAI when GEMINI_API_KEY is set; otherwise rule-based
          fallback.
        </p>
      ) : (
        <div className={`space-y-3 p-4 ${ui.panelViolet}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs font-semibold uppercase ${ui.h3Violet}`}>
              {PHASE_LABEL[insight.matchPhase]} · {insight.source}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                insight.riskScore >= 70
                  ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                  : insight.riskScore >= 40
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              Risk {insight.riskScore}/100
            </span>
          </div>
          <p className={`text-sm ${ui.body}`}>{insight.summary}</p>

          <div>
            <h4 className={`text-xs font-semibold uppercase ${ui.label}`}>
              Routing actions
            </h4>
            <ul className={`mt-2 space-y-1 text-xs ${ui.body}`}>
              {insight.routingActions.slice(0, 8).map((a, i) => (
                <li key={i}>
                  <span className="font-medium text-violet-700 dark:text-violet-300">
                    {a.zoneId}
                  </span>{" "}
                  → {a.direction}: {a.reason}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`text-xs font-semibold uppercase ${ui.label}`}>
              Recommendations
            </h4>
            <ul className={`mt-1 list-disc pl-4 text-xs ${ui.muted}`}>
              {insight.emergencyRecommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
