import {
  getMatchBroadcastStatus,
  MATCH_BROADCAST_LABEL,
} from "@/lib/match-broadcast";
import type { MatchBroadcastStatus } from "@/lib/types";

const styles: Record<MatchBroadcastStatus, string> = {
  live: "bg-orange-500/15 text-orange-700 ring-orange-500/35 dark:bg-orange-500/20 dark:text-orange-300 dark:ring-orange-500/40",
  offline:
    "bg-slate-200 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600",
};

interface MatchBroadcastBadgeProps {
  matchDate: string;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function MatchBroadcastBadge({
  matchDate,
  size = "sm",
  pulse = true,
}: MatchBroadcastBadgeProps) {
  const status = getMatchBroadcastStatus(matchDate);
  const label = MATCH_BROADCAST_LABEL[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ${
        size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"
      } ${styles[status]}`}
    >
      {status === "live" && pulse && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse dark:bg-orange-400"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}
