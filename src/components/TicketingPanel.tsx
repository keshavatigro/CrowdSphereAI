"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client";
import { ui } from "@/lib/theme";
import type { Gate, StadiumState, TicketEvent } from "@/lib/types";

interface TicketingPanelProps {
  gates: Gate[];
  recentTickets: TicketEvent[];
  onUpdate: (state: StadiumState) => void;
}

export function TicketingPanel({
  gates,
  recentTickets,
  onUpdate,
}: TicketingPanelProps) {
  const [gateId, setGateId] = useState("G1");
  const [section, setSection] = useState("N-A");
  const [seat, setSeat] = useState("A-12");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiPost<{ state: StadiumState; event: TicketEvent }>(
        "/api/ticketing/scan",
        { gateId, section, seat },
      );
      onUpdate(result.state);
      setMessage(
        result.event.valid
          ? `✓ Valid — ${gateId} / ${section} ${seat}`
          : `✗ Rejected — invalid credentials`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleScan} className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs text-slate-400">
            Gate
            <select
              value={gateId}
              onChange={(e) => setGateId(e.target.value)}
              className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
            >
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Section
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
            >
              {["N-A", "N-B", "S-A", "S-B", "E", "W", "VIP", "FC"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Seat
            <input
              value={seat}
              onChange={(e) => setSeat(e.target.value)}
              className={`mt-1 w-full rounded-lg px-3 py-2 text-sm ${ui.input}`}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Simulate Ticket Scan"}
        </button>
        {message && (
          <p className={`text-center text-xs ${ui.body}`}>{message}</p>
        )}
      </form>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase text-slate-500">
          Gate queues
        </h4>
        <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
          {gates.map((g) => (
            <li
              key={g.id}
              className="flex justify-between rounded border border-slate-200 bg-slate-100 px-2 py-1.5 text-slate-700 dark:border-slate-500 dark:bg-slate-800/50 dark:text-slate-300"
            >
              <span>{g.id}</span>
              <span>
                Q:{g.queueLength} · Scanned:{g.ticketsScanned}
                {!g.isOpen && " · CLOSED"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase text-slate-500">
          Recent scans
        </h4>
        <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-slate-400">
          {recentTickets.length === 0 && <li>No scans yet</li>}
          {recentTickets.slice(0, 8).map((t) => (
            <li key={t.id}>
              {t.valid ? "✓" : "✗"} {t.gateId} {t.section}-{t.seat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
