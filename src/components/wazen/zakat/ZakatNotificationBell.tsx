import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ICON_STROKE, NotificationsIcon } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useZakat } from "@/hooks/use-wazen-zakat";
import { formatMoney } from "@/lib/finance";
import { canCalculateZakat } from "@/lib/zakat";

/**
 * Notification centre. Today it carries the zakat reminder, which only appears
 * once nisab and a complete hawl are both satisfied.
 */
export function ZakatNotificationBell({
  lifeStage,
  currency,
}: {
  lifeStage: string | undefined;
  currency: string;
}) {
  const { t } = useWazenLocale();
  const enabled = canCalculateZakat(lifeStage);
  const { result } = useZakat();
  if (!enabled) return null;

  const due = result?.status === "due";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("zakatStatus")}>
          <NotificationsIcon className="size-4" strokeWidth={ICON_STROKE} />
          {due ? (
            <span className="absolute end-2 top-2 size-2 rounded-full bg-primary" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1rem))] text-sm">
        {!result ? (
          <p className="text-muted-foreground">…</p>
        ) : due ? (
          <div className="space-y-2">
            <p className="font-semibold text-primary">{t("zakatDueTitle")}</p>
            <p className="text-muted-foreground">{t("zakatDueBody")}</p>
            <p className="font-semibold">
              {t("zakatRemaining")}: {formatMoney(result.remaining, currency)}
            </p>
            <Link to="/zakat" className="inline-block text-primary underline underline-offset-4">
              {t("zakat")}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">{t("zakatNotDueTitle")}</p>
            <p className="text-muted-foreground">
              {result.needsStartDate
                ? t("zakatNeedsStartDate")
                : result.status === "below_nisab"
                  ? t("zakatBelowNisab")
                  : result.status === "recorded"
                    ? t("zakatRecordedBody")
                    : t("zakatHawlIncomplete")}
            </p>
            <Link to="/zakat" className="inline-block text-primary underline underline-offset-4">
              {t("zakat")}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
