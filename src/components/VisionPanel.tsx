"use client";

import { useRef, useState } from "react";
import { apiPost } from "@/lib/client";
import { getBlueprint } from "@/lib/blueprint";
import { ui } from "@/lib/theme";
import type { CopilotResponse, StadiumState, VisionAlert } from "@/lib/types";

interface VisionPanelProps {
  state: StadiumState;
  onUpdate: (state: StadiumState) => void;
  onCopilotReply?: (response: CopilotResponse) => void;
}

const concourses = getBlueprint().concourses;

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  const mimeType =
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";
  return { base64, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" };
}

export function VisionPanel({ state, onUpdate, onCopilotReply }: VisionPanelProps) {
  const [zoneId, setZoneId] = useState("food-court");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<VisionAlert | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const concourse = concourses.find((c) => c.zoneId === zoneId);
  const locationLabel = concourse?.name ?? zoneId;
  const zone = state.zones.find((z) => z.id === zoneId);
  const zonePct = zone
    ? Math.round((zone.occupancy / zone.capacity) * 100)
    : null;

  async function fetchBlueprintGuidance(alert: VisionAlert) {
    const sector = getBlueprint().sectors.find((s) => s.zoneId === zoneId);
    if (!sector) return;
    const g = await apiPost<{ guidance: string }>("/api/blueprint/exit", {
      sectorId: sector.id,
      incidentType: `Crowd density ${alert.densityScore}/10 at ${locationLabel}`,
    });
    setGuidance(g.guidance);
  }

  async function runDemoScan() {
    setLoading(true);
    setGuidance(null);
    try {
      const result = await apiPost<{
        alert: VisionAlert;
        state: StadiumState;
      }>("/api/vision/analyze", {
        locationLabel,
        zoneId,
        timeWindowMinutes: 5,
        demo: true,
      });
      setLastAlert(result.alert);
      onUpdate(result.state);
      await fetchBlueprintGuidance(result.alert);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Vision analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeUpload() {
    if (!files.length) {
      alert("Select at least one image, or use Simulate CCTV scan.");
      return;
    }
    setLoading(true);
    setGuidance(null);
    try {
      const images = await Promise.all(files.map(fileToBase64));
      const result = await apiPost<{
        alert: VisionAlert;
        state: StadiumState;
      }>("/api/vision/analyze", {
        locationLabel,
        zoneId,
        timeWindowMinutes: 5,
        images,
      });
      setLastAlert(result.alert);
      onUpdate(result.state);
      await fetchBlueprintGuidance(result.alert);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Vision analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function escalateToCopilot() {
    if (!lastAlert) return;
    setLoading(true);
    try {
      const copilot = await apiPost<CopilotResponse>(
        "/api/pipeline/vision-to-copilot",
        { visionAlertId: lastAlert.id },
      );
      onUpdate(copilot.state);
      onCopilotReply?.(copilot);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Copilot routing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className={`text-xs leading-relaxed ${ui.muted}`}>
        No live CCTV feed is required. <strong className={ui.body}>Simulate CCTV scan</strong>{" "}
        uses current zone occupancy, gate queues, and the stadium blueprint to produce
        density and anomaly findings (Gemini when <code className="text-[10px]">GEMINI_API_KEY</code>{" "}
        is set; otherwise rule-based).
      </p>

      <label className={`block text-xs font-medium ${ui.muted}`}>
        Camera / zone
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
        >
          {concourses.map((c) => (
            <option key={c.id} value={c.zoneId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {zonePct != null && (
        <p className={`rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs dark:border-violet-500/40 dark:bg-violet-950/25 ${ui.body}`}>
          Live telemetry for this zone: <strong>{zonePct}%</strong> full · status{" "}
          <strong className="capitalize">{zone?.status}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={runDemoScan}
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Simulate CCTV scan (no video needed)"}
      </button>

      <button
        type="button"
        onClick={() => setShowUpload((v) => !v)}
        className={`w-full text-xs underline-offset-2 hover:underline ${ui.muted}`}
      >
        {showUpload ? "Hide optional image upload" : "Optional: upload real CCTV frames"}
      </button>

      {showUpload && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-500">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`w-full rounded-lg border border-dashed py-3 text-sm ${ui.muted} border-slate-300 hover:border-violet-400 dark:border-slate-600`}
          >
            {files.length
              ? `${files.length} frame(s) selected`
              : "Select images (1–5)"}
          </button>
          <button
            type="button"
            onClick={analyzeUpload}
            disabled={loading || files.length === 0}
            className="w-full rounded-lg border border-violet-400 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50 dark:text-violet-200 dark:hover:bg-violet-950/30"
          >
            Analyze uploaded frames
          </button>
        </div>
      )}

      {lastAlert && (
        <div className={`p-3 text-xs ${ui.panelViolet}`}>
          <p className={`font-semibold ${ui.h3Violet}`}>
            Density {lastAlert.densityScore}/10 · {lastAlert.event} ·{" "}
            {lastAlert.analysis.source}
            {lastAlert.analysis.source === "rules" ? " (demo)" : ""}
          </p>
          <p className={`mt-1 ${ui.body}`}>{lastAlert.analysis.summary}</p>
          {lastAlert.analysis.anomalies.length > 0 && (
            <ul className={`mt-2 list-disc pl-4 ${ui.muted}`}>
              {lastAlert.analysis.anomalies.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
          {(lastAlert.analysis.unattendedBags ||
            lastAlert.analysis.panicIndicators ||
            lastAlert.analysis.altercationDetected) && (
            <p className={`mt-2 font-medium ${ui.warn}`}>
              Flags:{" "}
              {[
                lastAlert.analysis.unattendedBags && "unattended bags",
                lastAlert.analysis.panicIndicators && "panic signs",
                lastAlert.analysis.altercationDetected && "altercation",
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {guidance && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-400/55 dark:bg-sky-950/20 dark:text-sky-100">
          <p className="font-semibold text-sky-800 dark:text-sky-300">Blueprint guidance</p>
          <p className="mt-1">{guidance}</p>
        </div>
      )}

      {lastAlert && (
        <button
          type="button"
          onClick={escalateToCopilot}
          disabled={loading}
          className="w-full rounded-lg border border-emerald-500/40 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
        >
          Route alert to OpenAI Command Copilot →
        </button>
      )}

      {state.visionAlerts.length > 0 && (
        <div>
          <h4 className={`text-xs font-medium uppercase ${ui.label}`}>
            Recent vision alerts
          </h4>
          <ul className={`mt-2 max-h-24 space-y-1 overflow-y-auto text-xs ${ui.muted}`}>
            {state.visionAlerts.slice(0, 5).map((a) => (
              <li key={a.id}>
                {a.location}: {a.densityScore}/10 ({a.event})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
