import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance";

export function DashboardHeader({
  name,
  subtitle,
  eyebrow,
  today,
  avatar,
}: {
  name: string;
  subtitle: string;
  eyebrow: string;
  today: string;
  avatar?: ReactNode;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <section className="wazen-panel flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:p-10">
      {avatar ? <div className="shrink-0">{avatar}</div> : null}
      <div className="min-w-0">
        <p className="wazen-label">{eyebrow}</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">
          {greeting}, {name}.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        <p className="mt-5 text-sm text-muted-foreground">{today}</p>
      </div>
    </section>
  );
}

export function StatCard({
  label,
  amount,
  currency,
  tone = "neutral",
  hint,
  icon,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "neutral" | "positive" | "negative" | "gold";
  hint?: string;
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-chart-2"
      : tone === "negative"
        ? "text-destructive"
        : tone === "gold"
          ? "text-gold"
          : "text-foreground";
  return (
    <div className="wazen-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="wazen-label">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-3 text-2xl tabular-nums", toneClass)}>{formatMoney(amount, currency)}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("wazen-panel p-6 sm:p-7", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-secondary/60 px-6 py-10 text-center">
      {icon ? <span className="mb-3 text-muted-foreground">{icon}</span> : null}
      <p className="text-base">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "gold",
  className,
}: {
  value: number;
  max: number;
  tone?: "gold" | "sage" | "charcoal";
  className?: string;
}) {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
  const fill =
    tone === "sage" ? "bg-chart-2" : tone === "charcoal" ? "bg-primary" : "bg-gold";
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function percentOf(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.round((value / max) * 100), 100);
}
