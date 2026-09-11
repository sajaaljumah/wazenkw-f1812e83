import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LockedIcon, PremiumIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import type { PremiumFeature } from "@/lib/subscription";
import { useWazenLabels } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PremiumBadge({ className }: { className?: string }) {
  const { t } = useWazenLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs text-gold",
        className,
      )}
    >
      <PremiumIcon className="size-3.5" strokeWidth={ICON_STROKE} />
      {t("premium")}
    </span>
  );
}

export function UpgradePrompt({
  title,
  description,
  compact,
  /** Children/teenagers never see checkout or upgrade calls to action. */
  hideCta,
}: {
  title: string;
  description: string;
  compact?: boolean | undefined;
  hideCta?: boolean | undefined;
}) {
  const { t } = useWazenLocale();
  const ctaLabel = t("seePremium");
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border border-dashed border-border bg-secondary/30 text-center",
        compact ? "p-6" : "p-8",
      )}
    >
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-gold/15 text-gold">
        <LockedIcon className="size-5" strokeWidth={ICON_STROKE} />
      </span>
      <div>
        <p className="text-lg">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {hideCta ? null : (
        <Button asChild className="mx-auto"><Link to="/subscription">{ctaLabel}</Link></Button>
      )}
    </div>
  );
}

/**
 * Wraps premium-only UI. This is a presentation convenience only — the matching
 * server function must still call `requirePremium`, so hiding is never the only
 * protection.
 */
export function PremiumGate({
  feature,
  children,
  fallback,
  compact,
}: {
  feature: PremiumFeature;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean | undefined;
}) {
  const { can, isLoading, canSubscribe } = useSubscriptionAccess();
  const { t } = useWazenLocale();
  const labels = useWazenLabels();

  if (isLoading) {
    return <div className="wazen-panel h-32 animate-pulse bg-secondary/40" />;
  }
  if (can(feature)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <UpgradePrompt
      title={`${labels.featureLabel(feature)} — ${t("premiumFeatureSuffix")}`}
      description={canSubscribe ? labels.featureDescription(feature) : t("askGuardian")}
      compact={compact}
      hideCta={!canSubscribe}
    />
  );
}
