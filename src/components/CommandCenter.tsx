"use client";

import { useState } from "react";
import { CrowdSphereLogo } from "@/components/CrowdSphereLogo";
import { AIAdvisor } from "./AIAdvisor";
import { ArchitectureStrip } from "./ArchitectureStrip";
import { CopilotPanel } from "./CopilotPanel";
import { EmergencyPanel } from "./EmergencyPanel";
import { VisionPanel } from "./VisionPanel";
import { TicketingPanel } from "./TicketingPanel";
import { ZoneMap } from "./ZoneMap";
import { apiPatch } from "@/lib/client";
import { useStadiumStream } from "@/hooks/useStadiumStream";
import { useVoiceAlerts } from "@/hooks/useVoiceAlerts";
import { getFixtureById } from "@/lib/ipl-fixtures";
import { PHASE_LABEL } from "@/lib/match-phase-profiles";
import type { CopilotResponse, MatchPhase, StadiumState } from "@/lib/types";
import { ui } from "@/lib/theme";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { MatchContextOverlay } from "./dashboard/MatchContextOverlay";
import { DashboardSection } from "./dashboard/DashboardSection";
import { MatchEventAnalytics } from "./dashboard/MatchEventAnalytics";
import { RealtimeWidgets } from "./dashboard/RealtimeWidgets";
import { RiskPredictionPanel } from "./dashboard/RiskPredictionPanel";
import { SecurityIntelligence } from "./dashboard/SecurityIntelligence";
import { StadiumDetailModal } from "./dashboard/StadiumDetailModal";

export function CommandCenter() {
  const { state, connected, error, setState } = useStadiumStream();
  const voiceAlerts = useVoiceAlerts(state);
  const [copilotInjection, setCopilotInjection] =
    useState<CopilotResponse | null>(null);
  const [stadiumModalOpen, setStadiumModalOpen] = useState(false);
  const [matchContextLoading, setMatchContextLoading] = useState(false);
  const [matchContextMessage, setMatchContextMessage] = useState("");
  const [pendingMatch, setPendingMatch] = useState<{
    matchId?: string;
    phase?: MatchPhase;
  } | null>(null);

  if (!state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        <CrowdSphereLogo size="splash" priority />
        <p>Connecting to CrowdSphere AI…</p>
      </div>
    );
  }

  async function patchMatch(body: { phase?: MatchPhase; fixtureId?: string }) {
    setPendingMatch({
      matchId: body.fixtureId,
      phase: body.phase,
    });
    setMatchContextLoading(true);

    if (body.fixtureId) {
      const fixture = getFixtureById(body.fixtureId);
      setMatchContextMessage(
        fixture
          ? `Loading ${fixture.title} (${fixture.competition})…`
          : "Loading match…",
      );
    } else if (body.phase) {
      setMatchContextMessage(`Switching to ${PHASE_LABEL[body.phase]}…`);
    } else {
      setMatchContextMessage("Updating match context…");
    }

    try {
      const result = await apiPatch<{
        state: StadiumState;
        insight?: StadiumState["lastInsight"];
      }>("/api/match", body);
      setState(result.state);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setMatchContextLoading(false);
      setPendingMatch(null);
    }
  }

  function setPhase(phase: MatchPhase) {
    if (!state || phase === state.matchPhase || matchContextLoading) return;
    void patchMatch({ phase });
  }

  function setFixture(fixtureId: string) {
    if (!state || fixtureId === state.matchId || matchContextLoading) return;
    void patchMatch({ fixtureId });
  }

  const displayMatchId = pendingMatch?.matchId ?? state.matchId;
  const displayMatchPhase = pendingMatch?.phase ?? state.matchPhase;

  return (
    <div className="dashboard-bg min-h-screen text-slate-900 dark:text-slate-100">
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {voiceAlerts.enabled && voiceAlerts.lastSpoken
          ? voiceAlerts.lastSpoken
          : ""}
      </p>
      <DashboardHeader
        connected={connected}
        weather={state.weather}
        matchId={displayMatchId}
        matchName={state.matchName}
        matchDate={state.matchDate}
        matchPhase={displayMatchPhase}
        onMatchChange={setFixture}
        onPhaseChange={setPhase}
        error={error}
        matchContextLoading={matchContextLoading}
        matchContextMessage={matchContextMessage}
        onOpenStadium={() => setStadiumModalOpen(true)}
        voiceAlertsEnabled={voiceAlerts.enabled}
        onVoiceAlertsToggle={voiceAlerts.toggle}
        matchBroadcast={state.matchBroadcast}
      />

      <div className="relative">
        <MatchContextOverlay
          open={matchContextLoading}
          title={matchContextMessage || "Updating match context"}
        />
        <main
          className={`mx-auto max-w-7xl space-y-8 px-4 py-8 transition-opacity duration-200 sm:px-6 ${
            matchContextLoading
              ? "pointer-events-none select-none opacity-50"
              : ""
          }`}
          aria-busy={matchContextLoading}
        >
        <DashboardSection
          id="realtime"
          title="Real-time monitoring"
          subtitle="Live telemetry from gates, zones, vision, and incidents"
          accent="emerald"
        >
          <RealtimeWidgets state={state} />
        </DashboardSection>

        <DashboardSection
          id="analytics"
          title="Match & event analytics"
          subtitle="Attendance trends and incident correlation by fixture"
          accent="amber"
        >
          <MatchEventAnalytics state={state} />
        </DashboardSection>

        <DashboardSection
          id="security"
          title="Security intelligence"
          subtitle="Historical gate patterns, flagged matches, and live posture"
          accent="red"
        >
          <SecurityIntelligence state={state} />
        </DashboardSection>

        <DashboardSection
          id="risk"
          title="AI-based risk prediction"
          subtitle="Composite risk score from density, vision, emergencies, and Gemini insights"
          accent="violet"
        >
          <RiskPredictionPanel state={state} />
        </DashboardSection>

        <ArchitectureStrip />

        <DashboardSection
          id="operations"
          title="Live operations"
          subtitle="Crowd flow, ticketing, vision, copilot, and emergency controls"
          accent="sky"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${ui.label}`}>
                Crowd flow map
              </h3>
              <ZoneMap zones={state.zones} />
            </div>
            <div>
              <h3 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${ui.label}`}>
                Unified ticketing
              </h3>
              <TicketingPanel
                gates={state.gates}
                recentTickets={state.recentTickets}
                onUpdate={setState}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className={`p-4 ${ui.opsViolet}`}>
              <h3 className={`mb-3 ${ui.h3Violet}`}>
                Gemini vision — density &amp; anomalies
              </h3>
              <VisionPanel
                state={state}
                onUpdate={setState}
                onCopilotReply={setCopilotInjection}
              />
            </div>
            <div className={`p-4 ${ui.opsEmerald}`}>
              <h3 className={`mb-3 ${ui.h3Emerald}`}>
                OpenAI command copilot
              </h3>
              <CopilotPanel
                state={state}
                onUpdate={setState}
                injectedReply={copilotInjection}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className={`p-4 ${ui.opsRed}`}>
              <h3 className={`mb-3 ${ui.h3Red}`}>
                Emergency response
              </h3>
              <EmergencyPanel
                zones={state.zones}
                incidents={state.activeIncidents}
                onUpdate={setState}
              />
            </div>
            <div className={`p-4 ${ui.opsViolet}`}>
              <h3 className={`mb-3 ${ui.h3Violet}`}>
                Gemini telemetry advisor
              </h3>
              <AIAdvisor state={state} onUpdate={setState} />
            </div>
          </div>

          {Object.keys(state.signageMessages).length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-400 bg-amber-50 p-4 shadow-sm ring-1 ring-amber-200/80 dark:border-amber-500/60 dark:bg-amber-950/50 dark:ring-amber-500/30">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Digital signage
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-amber-950 dark:text-amber-50">
                {Object.entries(state.signageMessages).map(([zid, msg]) => (
                  <li key={zid}>
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      {zid}
                    </span>
                    : {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DashboardSection>
        </main>
      </div>

      <StadiumDetailModal
        open={stadiumModalOpen}
        onClose={() => setStadiumModalOpen(false)}
        liveGates={state.gates}
      />
    </div>
  );
}
