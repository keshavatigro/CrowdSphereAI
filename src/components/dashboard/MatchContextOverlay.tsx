"use client";

import { ui } from "@/lib/theme";

interface MatchContextOverlayProps {
  open: boolean;
  title: string;
  subtitle?: string;
}

export function MatchContextOverlay({
  open,
  title,
  subtitle = "Refreshing crowd telemetry, security posture, and Gemini advisor…",
}: MatchContextOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/20 backdrop-blur-[3px] dark:bg-slate-950/45"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      <div
        className={`mx-4 w-full max-w-md rounded-2xl border p-8 text-center shadow-2xl ${ui.panel}`}
      >
        <div
          className="match-context-spinner mx-auto mb-5 h-14 w-14 rounded-full border-[3px] border-slate-200 border-t-sky-500 dark:border-slate-600 dark:border-t-sky-400"
          aria-hidden
        />
        <p className={`text-base font-semibold ${ui.heading}`}>{title}</p>
        <p className={`mt-2 text-sm leading-relaxed ${ui.muted}`}>{subtitle}</p>
        <ul className={`mt-5 space-y-1.5 text-left text-xs ${ui.body}`}>
          <li className="flex items-center gap-2">
            <StepDot active />
            Updating zone occupancy &amp; gate queues
          </li>
          <li className="flex items-center gap-2">
            <StepDot active />
            Applying security &amp; match context
          </li>
          <li className="flex items-center gap-2">
            <StepDot pulse />
            Running Gemini crowd analysis
          </li>
        </ul>
      </div>
    </div>
  );
}

function StepDot({ active, pulse }: { active?: boolean; pulse?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        pulse
          ? "animate-pulse bg-violet-500"
          : active
            ? "bg-sky-500"
            : "bg-slate-300 dark:bg-slate-600"
      }`}
      aria-hidden
    />
  );
}
