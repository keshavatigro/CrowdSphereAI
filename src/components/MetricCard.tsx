interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
}

const accentMap = {
  green:
    "border-emerald-500/40 text-emerald-600 dark:border-emerald-400/55 dark:text-emerald-400",
  amber:
    "border-amber-500/40 text-amber-600 dark:border-amber-400/55 dark:text-amber-400",
  red: "border-red-500/40 text-red-600 dark:border-red-400/55 dark:text-red-400",
  blue: "border-sky-500/40 text-sky-600 dark:border-sky-400/55 dark:text-sky-400",
};

export function MetricCard({ label, value, sub, accent = "blue" }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-500 dark:bg-slate-900/60 ${accentMap[accent]}`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">{sub}</p>
      )}
    </div>
  );
}
