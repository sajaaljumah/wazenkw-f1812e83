import { Link } from "@tanstack/react-router";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import {
  CheckIcon,
  ForwardIcon,
  ICON_STROKE,
  ScheduledIcon,
  ZakatIcon,
} from "@/components/wazen/icons";

import type { ZakatResult } from "@/lib/zakat";
import { cn } from "@/lib/utils";

/**
 * "حان وقت زكاتك" appears only when the wealth reached nisab AND a full Hijri
 * year has passed. Every other state explains precisely what is missing.
 */
export function ZakatAlert({
  result,
  currency,
  compact = false,
  className,
}: {
  result: ZakatResult;
  currency: string;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useWazenLocale();
  const due = result.status === "due";
  const recorded = result.status === "recorded";

  const title = due
    ? t("zakatDueTitle")
    : recorded
      ? t("zakatRecorded")
      : t("zakatNotDueTitle");

  const body = due
    ? t("zakatDueBody")
    : recorded
      ? t("zakatRecordedBody")
      : result.needsStartDate
        ? t("zakatNeedsStartDate")
        : result.status === "below_nisab"
          ? t("zakatBelowNisab")
          : t("zakatHawlIncomplete");

  const Icon = due ? HandCoinsIcon : recorded ? CheckIcon : ScheduledIcon;

  return (
    <div
      className={cn(
        "wazen-card flex flex-wrap items-center gap-4 p-5",
        due ? "border-primary/45 bg-primary/[0.06]" : "",
        className,
      )}
      role={due ? "alert" : undefined}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full",
          due ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={ICON_STROKE} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-base font-semibold", due && "text-primary")}>{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        {due ? (
          <p className="mt-1 text-sm font-semibold">
            {t("zakatRemaining")}: {formatMoney(result.remaining, currency)}
          </p>
        ) : null}
      </div>
      {compact ? (
        <Link
          to="/zakat"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("zakat")}
          <ForwardIcon className="size-4" strokeWidth={ICON_STROKE} />
        </Link>
      ) : null}
    </div>
  );
}
