import { ui } from "@/lib/theme";

interface DashboardSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  accent?: "sky" | "violet" | "emerald" | "amber" | "red";
  children: React.ReactNode;
}

const accentBorder = {
  sky: "border-l-sky-500",
  violet: "border-l-violet-500",
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
};

export function DashboardSection({
  id,
  title,
  subtitle,
  accent = "sky",
  children,
}: DashboardSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-2xl border border-l-4 p-5 ${ui.section} ${accentBorder[accent]}`}
    >
      <header className="mb-5">
        <h2 className={ui.sectionTitle}>{title}</h2>
        {subtitle && <p className={`mt-1 ${ui.sectionSubtitle}`}>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
