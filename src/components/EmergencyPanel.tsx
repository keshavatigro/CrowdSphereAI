"use client";

import { useState } from "react";
import { apiPatch, apiPost } from "@/lib/client";
import { ui } from "@/lib/theme";
import type { EmergencyIncident, EmergencyType, StadiumState, Zone } from "@/lib/types";

interface EmergencyPanelProps {
  zones: Zone[];
  incidents: EmergencyIncident[];
  onUpdate: (state: StadiumState) => void;
}

export function EmergencyPanel({
  zones,
  incidents,
  onUpdate,
}: EmergencyPanelProps) {
  const [type, setType] = useState<EmergencyType>("crowd_crush");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">(
    "high",
  );
  const [zoneIds, setZoneIds] = useState<string[]>(["north-stand"]);
  const [message, setMessage] = useState(
    "Sudden surge detected at north concourse choke point",
  );
  const [loading, setLoading] = useState(false);

  function toggleZone(id: string) {
    setZoneIds((prev) =>
      prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id],
    );
  }

  async function trigger(e: React.FormEvent) {
    e.preventDefault();
    if (zoneIds.length === 0) return;
    setLoading(true);
    try {
      const result = await apiPost<{ state: StadiumState }>("/api/emergency", {
        type,
        severity,
        zoneIds,
        message,
      });
      onUpdate(result.state);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    try {
      const result = await apiPatch<{ state: StadiumState }>("/api/emergency", {
        incidentId: id,
      });
      onUpdate(result.state);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={trigger} className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EmergencyType)}
              className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
            >
              <option value="crowd_crush">Crowd crush risk</option>
              <option value="medical">Medical</option>
              <option value="security">Security</option>
              <option value="weather">Weather</option>
              <option value="fire">Fire</option>
              <option value="evacuation">Evacuation</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Severity
            <select
              value={severity}
              onChange={(e) =>
                setSeverity(
                  e.target.value as "low" | "medium" | "high" | "critical",
                )
              }
              className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>

        <div>
          <p className="text-xs text-slate-400">Affected zones</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZone(z.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  zoneIds.includes(z.id)
                    ? "bg-red-600 text-white"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {z.name}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs text-slate-400">
          Situation report
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
          />
        </label>

        <button
          type="submit"
          disabled={loading || zoneIds.length === 0}
          className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "Activating…" : "Trigger Emergency Protocol"}
        </button>
      </form>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase text-red-400/80">
          Active incidents
        </h4>
        {incidents.length === 0 ? (
          <p className="text-xs text-slate-500">No active emergencies</p>
        ) : (
          <ul className="space-y-3">
            {incidents.map((inc) => (
              <li
                key={inc.id}
                className={`rounded-lg p-3 ${ui.panelRed}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-red-200">
                      {inc.type.replace("_", " ")} · {inc.severity}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{inc.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resolve(inc.id)}
                    className="shrink-0 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600"
                  >
                    Resolve
                  </button>
                </div>
                <ol className={`mt-2 list-decimal space-y-0.5 pl-4 text-xs ${ui.body}`}>
                  {inc.playbook.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
