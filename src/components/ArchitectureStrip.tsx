export function ArchitectureStrip() {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-violet-100 via-slate-50 to-sky-100 px-4 py-3 text-xs text-slate-700 dark:border-slate-500 dark:from-violet-950/40 dark:via-slate-900/60 dark:to-sky-950/40 dark:text-slate-300">
      <p className="font-medium text-slate-900 dark:text-slate-200">Eyes + Brain architecture</p>
      <p className="mt-1 leading-relaxed">
        <span className="text-violet-700 dark:text-violet-300">Gemini</span> analyzes CCTV frames &
        stadium blueprints ·{" "}
        <span className="text-emerald-700 dark:text-emerald-300">OpenAI GPT-4o</span> powers the
        Command Copilot with function calling · Both execute routing, shelter,
        signage &amp; notifications on your backend
      </p>
    </div>
  );
}
