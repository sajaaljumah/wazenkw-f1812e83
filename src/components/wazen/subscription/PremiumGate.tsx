import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { FEATURE_DESCRIPTIONS, FEATURE_LABELS, type PremiumFeature } from "@/lib/subscription";
import { cn } from "@/lib/utils";

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs text-gold",
        className,
      )}
    >
      <Sparkles className="size-3.5" strokeWidth={1.5} />
      Premium
    </span>
  );
}

export function UpgradePrompt({
  title,
  description,
  compact,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "wazen-panel flex flex-col gap-4 bg-secondary/40 text-center",
        compact ? "p-6" : "p-8",
      )}
    >
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-gold/15 text-gold">
        <Lock className="size-5" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-lg">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        to="/subscription"
        className="mx-auto rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        See Premium
      </Link>
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
  compact?: boolean;
}) {
  const { can, isLoading } = useSubscriptionAccess();

  if (isLoading) {
    return <div className="wazen-panel h-32 animate-pulse bg-secondary/40" />;
  }
  if (can(feature)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <UpgradePrompt
      title={`${FEATURE_LABELS[feature]} is a Premium feature`}
      description={FEATURE_DESCRIPTIONS[feature]}
      compact={compact}
    />
  );
}
