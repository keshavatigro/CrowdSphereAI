export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "crowdsphere-theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return v === "light" || v === "dark" ? v : null;
}

export const THEME_CHANGE_EVENT = "crowdsphere-theme-change";

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }
}

/** Shared surfaces & typography — always pair light + dark classes */
export const ui = {
  page: "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
  header:
    "border-slate-200 bg-white/95 dark:border-slate-600 dark:bg-slate-950/95",
  subheader:
    "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/50",
  section:
    "border-slate-200 bg-white shadow-md shadow-slate-200/60 dark:border-slate-600 dark:bg-slate-900/50 dark:shadow-black/20",
  panel:
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-500 dark:bg-slate-800/90 dark:shadow-none",
  panelInset:
    "rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-900/60",
  cardInner:
    "rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-900/60",
  panelViolet:
    "rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-400/55 dark:bg-violet-950/30",
  panelRed:
    "rounded-lg border border-red-200 bg-red-50 dark:border-red-400/55 dark:bg-red-950/30",
  panelEmerald:
    "rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-400/55 dark:bg-emerald-950/20",
  opsViolet:
    "rounded-xl border border-violet-200 bg-violet-50/80 dark:border-violet-400/50 dark:bg-violet-950/15",
  opsEmerald:
    "rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-400/50 dark:bg-emerald-950/15",
  opsRed:
    "rounded-xl border border-red-200 bg-red-50/80 dark:border-red-400/50 dark:bg-red-950/15",
  stat:
    "rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/80",
  statHighlight:
    "rounded-lg border border-amber-300 bg-amber-50 ring-1 ring-amber-200 dark:border-amber-400/60 dark:bg-amber-500/10 dark:ring-amber-400/40",
  input:
    "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500",
  muted: "text-slate-600 dark:text-slate-400",
  body: "text-slate-700 dark:text-slate-300",
  label: "text-slate-500 dark:text-slate-400",
  heading: "text-slate-900 dark:text-white",
  sectionTitle: "text-base font-semibold text-slate-900 dark:text-white",
  sectionSubtitle: "text-sm text-slate-600 dark:text-slate-400",
  h3: "text-sm font-semibold text-slate-800 dark:text-white",
  h3Violet: "text-sm font-semibold text-violet-800 dark:text-violet-300",
  h3Emerald: "text-sm font-semibold text-emerald-800 dark:text-emerald-300",
  h3Red: "text-sm font-semibold text-red-800 dark:text-red-300",
  accentOrange: "text-orange-600 dark:text-orange-300",
  accentSky: "text-sky-700 dark:text-sky-400",
  warn: "text-amber-800 dark:text-amber-200",
  navLink:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
} as const;
