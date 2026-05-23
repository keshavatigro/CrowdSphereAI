"use client";

import type { Zone } from "@/lib/types";

const statusColors: Record<Zone["status"], string> = {
  normal:
    "bg-emerald-50 border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-400/60",
  elevated:
    "bg-amber-50 border-amber-300 dark:bg-amber-500/20 dark:border-amber-400/60",
  critical:
    "bg-red-50 border-red-300 dark:bg-red-500/20 dark:border-red-400/60",
  closed:
    "bg-slate-100 border-slate-300 dark:bg-slate-600/30 dark:border-slate-400/60",
};

const directionLabel = {
  in: "Ingress",
  out: "Egress",
  hold: "Hold",
};

interface ZoneMapProps {
  zones: Zone[];
}

export function ZoneMap({ zones }: ZoneMapProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {zones.map((zone) => {
        const pct = Math.round((zone.occupancy / zone.capacity) * 100);
        return (
          <div
            key={zone.id}
            className={`rounded-lg border p-3 ${statusColors[zone.status]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">{zone.name}</h3>
                <p className="text-xs text-slate-600 capitalize dark:text-slate-400">{zone.status}</p>
              </div>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {directionLabel[zone.recommendedDirection]}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  {zone.occupancy.toLocaleString()} / {zone.capacity.toLocaleString()}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 90
                      ? "bg-red-500"
                      : pct >= 78
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Flow: {zone.flowRatePerMin}/min
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
