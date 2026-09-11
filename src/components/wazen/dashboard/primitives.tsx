import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance";
import { useReveal } from "@/hooks/use-reveal";
import { ExpandIcon, ICON_STROKE } from "@/components/wazen/icons";

import { useWazenLocale } from "@/components/wazen/WazenLocale";

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
  const { t } = useWazenLocale();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 18 ? t("goodAfternoon") : t("goodEvening");
  return (
    <section className="wazen-masthead relative overflow-hidden" data-tour="welcome">
      {/* Quiet editorial wash keeps the greeting from reading as another generic card. */}
      <div aria-hidden className="wazen-hero-wash" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {avatar ? <div className="shrink-0">{avatar}</div> : null}
        <div className="min-w-0">
          <p className="wazen-label">{today} · {eyebrow}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">
            {greeting}, {name}.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Primary balance statement.
 * One dominant number with supporting figures on a divided rail — the hierarchy
 * a banking app leads with, instead of four equal cards.
 */
export function BalanceHero({
  label,
  amount,
  currency,
  hint,
  items,
  action,
}: {
  label: string;
  amount: number;
  currency: string;
  hint?: string;
  items: { label: string; amount: number; tone?: "positive" | "negative" | "gold" | "neutral" }[];
  action?: ReactNode;
}) {
  return (
    <section className="wazen-balance" data-tour="balance">
      <div aria-hidden className="wazen-balance-grid" />
      <div className="relative grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-end">
        <div className="min-w-0">
          <p className="wazen-label text-primary-foreground/65">{label}</p>
          <p className="wazen-number mt-3 break-words text-3xl leading-none min-[375px]:text-4xl sm:text-5xl">{formatMoney(amount, currency)}</p>
          {hint ? <p className="mt-3 max-w-sm text-sm text-primary-foreground/70">{hint}</p> : null}
          {action ? <div className="mt-6">{action}</div> : null}
        </div>
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-primary-foreground/15 min-[390px]:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0 bg-transparent px-3 py-4 sm:px-4">
              <dt className="text-[0.68rem] tracking-[0.14em] uppercase text-primary-foreground/60">{item.label}</dt>
              <dd
                 className={cn(
                   "wazen-number mt-2 break-words text-sm sm:text-base",
                  item.tone === "positive"
                    ? "wazen-balance-pos"
                    : item.tone === "negative"
                      ? "wazen-balance-neg"
                      : item.tone === "gold"
                        ? "wazen-balance-gold"
                        : "text-primary-foreground",
                )}
              >
                {formatMoney(item.amount, currency)}
              </dd>
            </div>
          ))}
        </dl>
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
  className,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "neutral" | "positive" | "negative" | "gold";
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-chart-2"
      : tone === "negative"
        ? "text-destructive"
        : tone === "gold"
          ? "text-gold"
          : "text-foreground";
  const rule =
    tone === "positive"
      ? "before:bg-chart-2"
      : tone === "negative"
        ? "before:bg-destructive"
        : tone === "gold"
          ? "before:bg-gold"
          : "before:bg-border";
  return (
    <div className={cn("wazen-stat", rule, className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="wazen-label">{label}</span>
        {icon ? <span className="text-muted-foreground/80">{icon}</span> : null}
      </div>
      <p className={cn("wazen-number mt-2.5 text-xl sm:text-2xl", toneClass)}>{formatMoney(amount, currency)}</p>
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
    <section className={cn("wazen-card min-w-0", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 pb-4">
        <h2 className="min-w-0 text-xl sm:text-2xl">{title}</h2>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function JourneySection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("wazen-journey", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="wazen-label wazen-journey-eyebrow">{eyebrow}</p> : null}
          <h2 className={cn("text-xl sm:text-2xl", eyebrow && "mt-2")}>{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function InsightStrip({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <aside className="wazen-insight" aria-label={label}>
      {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
      <div className="min-w-0">
        <p className="wazen-label">{label}</p>
        <div className="mt-1 text-sm leading-relaxed text-foreground">{children}</div>
      </div>
    </aside>
  );
}

export function DisclosurePanel({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cn("wazen-disclosure group", className)} open={defaultOpen}>
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 focus-visible:outline-hidden">
        <span className="min-w-0">
          <span className="block text-base font-semibold sm:text-lg">{title}</span>
          {summary ? <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">{summary}</span> : null}
        </span>
        <span className="wazen-disclosure-control flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all group-open:rotate-180 group-open:bg-accent group-open:text-primary">
          <ExpandIcon className="size-4" strokeWidth={ICON_STROKE} />
        </span>
      </summary>
      <div className="mt-5 border-t border-border/70 pt-5">{children}</div>
    </details>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/50 px-6 py-10 text-center">
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
  const [visiblePercent, setVisiblePercent] = useState(0);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisiblePercent(percent));
    return () => window.cancelAnimationFrame(frame);
  }, [percent]);
  const fill =
    tone === "sage" ? "bg-chart-2" : tone === "charcoal" ? "bg-primary" : "bg-gold";
  return (
    <div
      className={cn("wazen-progress-track h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      data-complete={percent >= 100 ? "true" : undefined}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("wazen-progress-fill h-full rounded-full transition-[width] duration-700 ease-out", fill)}
        style={{ width: `${visiblePercent}%` }}
      />
    </div>
  );
}

export function percentOf(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.round((value / max) * 100), 100);
}
