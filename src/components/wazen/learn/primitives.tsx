import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { ExpandIcon, ICON_STROKE } from "@/components/wazen/icons";
import { LEARN_COPY, type LearnCopyKey, type Text } from "@/lib/learning";
import { cn } from "@/lib/utils";

/** Learn-page copy, resolved from the account language (Arabic by default). */
export function useLearnCopy() {
  const { language } = useWazenLocale();
  return {
    language,
    lc: (key: LearnCopyKey) => LEARN_COPY[language][key],
    s: (text: Text) => text[language],
  };
}

/** Soft progress bar that eases to its value — used across the Learn page. */
export function LearnProgressBar({
  percent,
  className,
  tone = "champagne",
}: {
  percent: number;
  className?: string;
  tone?: "champagne" | "deep";
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setWidth(Math.max(0, Math.min(100, percent))), 100);
    return () => window.clearTimeout(timer);
  }, [percent]);
  return (
    <div
      className={cn("wazen-progress-track h-3 w-full overflow-hidden rounded-full bg-kid-soft/70", className)}
      data-complete={percent >= 100 ? "true" : undefined}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "wazen-progress-fill h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "deep" ? "bg-kid-deep" : "bg-kid-champagne",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function LearnSection({
  title,
  caption,
  icon,
  children,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  caption?: string;
  icon?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (collapsible) {
    return (
      <details className="kid-panel group p-5 sm:p-6" open={defaultOpen}>
        <summary className="flex min-w-0 cursor-pointer list-none items-start gap-3 focus-visible:outline-hidden">
          {icon ? <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-kid-soft/70 text-kid-deep">{icon}</span> : null}
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold sm:text-xl">{title}</span>
            {caption ? <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">{caption}</span> : null}
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kid-soft/70 text-kid-deep transition-transform group-open:rotate-180">
            <ExpandIcon className="size-4" strokeWidth={ICON_STROKE} />
          </span>
        </summary>
        <div className="mt-5 border-t border-kid-soft pt-5">{children}</div>
      </details>
    );
  }
  return (
    <section className="space-y-4">
      <header className="flex min-w-0 items-start gap-3 px-1">
        {icon ? (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-kid-soft/70 text-kid-deep">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-lg sm:text-xl">{title}</h2>
          {caption ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{caption}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function LearnStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="kid-panel min-w-0 p-4">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl tabular-nums sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Shared dialog frame for lessons, games and quizzes. */
export function LearnDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="kid-theme max-h-[88vh] overflow-y-auto rounded-[1.75rem] bg-card sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle className="text-xl sm:text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function LearnButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "soft";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "kid-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary"
          ? "bg-kid-deep text-kid-ivory"
          : "border border-kid-soft bg-kid-tint text-kid-deep",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Correct / incorrect feedback line with calm, non-shaming wording. */
export function Feedback({ state, message }: { state: "correct" | "wrong" | null; message?: string }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cn(
        "kid-pop rounded-2xl px-4 py-3 text-sm",
        state === "correct"
          ? "bg-kid-soft/70 text-kid-deep"
          : "border border-border bg-secondary/60 text-foreground",
      )}
    >
      {message}
    </p>
  );
}
