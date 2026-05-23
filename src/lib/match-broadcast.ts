import type { MatchBroadcastStatus } from "./types";

export function parseFixtureDate(dateStr: string): Date | null {
  const parsed = Date.parse(dateStr.trim());
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

/** True when the fixture calendar date is today (local time). */
export function isMatchLiveToday(
  matchDate: string,
  now: Date = new Date(),
): boolean {
  const fixtureDay = parseFixtureDate(matchDate);
  if (!fixtureDay) return false;
  return (
    fixtureDay.getFullYear() === now.getFullYear() &&
    fixtureDay.getMonth() === now.getMonth() &&
    fixtureDay.getDate() === now.getDate()
  );
}

export function getMatchBroadcastStatus(
  matchDate: string,
  now?: Date,
): MatchBroadcastStatus {
  return isMatchLiveToday(matchDate, now) ? "live" : "offline";
}

export const MATCH_BROADCAST_LABEL: Record<MatchBroadcastStatus, string> = {
  live: "Live",
  offline: "Offline",
};
