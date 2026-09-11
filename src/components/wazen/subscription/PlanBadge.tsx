import { FreePlanIcon, PremiumIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { cn } from "@/lib/utils";

/**
 * Subscription indicator. Text + icon carry the meaning, never colour alone.
 * Status is read from server-computed entitlements, so it always matches access.
 */
export function PlanBadge({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm";
}) {
  const { isPremium, isLoading } = useSubscriptionAccess();
  const { t } = useWazenLocale();

  if (isLoading) {
    return <span className={cn("inline-block h-6 w-16 animate-pulse rounded-md bg-secondary", className)} />;
  }

  const Icon = isPremium ? PremiumIcon : FreePlanIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        isPremium
          ? "border-gold/25 bg-gold/10 text-gold"
          : "border-border bg-secondary text-muted-foreground",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={ICON_STROKE} />
      {isPremium ? t("premium") : t("free")}
    </span>
  );
}
