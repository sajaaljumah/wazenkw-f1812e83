import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { PremiumBadge } from "@/components/wazen/subscription/PremiumGate";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { openBillingPortal, startPremiumUpgrade } from "@/lib/subscription.functions";
import {
  FEATURE_DESCRIPTIONS,
  FEATURE_LABELS,
  FREE_PLAN_HIGHLIGHTS,
  PLAN_LABELS,
  PREMIUM_FEATURES,
  PREMIUM_PRICE,
  STATUS_LABELS,
  formatPlanDate,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
  head: () => ({
    meta: [
      { title: "Your Wazen plan — Free & Premium" },
      {
        name: "description",
        content:
          "Review your Wazen plan, subscription status and renewal date, and see what Premium unlocks.",
      },
      { property: "og:title", content: "Your Wazen plan — Free & Premium" },
      {
        property: "og:description",
        content: "Manage your Wazen subscription and premium feature access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SubscriptionPage() {
  const { entitlements, isPremium, isLoading, refetch } = useSubscriptionAccess();
  const upgrade = useServerFn(startPremiumUpgrade);
  const manage = useServerFn(openBillingPortal);
  const [busy, setBusy] = useState<"upgrade" | "manage" | null>(null);

  async function handleUpgrade() {
    setBusy("upgrade");
    try {
      const result = await upgrade({ data: { interval: "month" } });
      if (result.status === "redirect" && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast.info("Premium checkout is coming soon", {
        description: "Payments aren't connected yet — your plan is unchanged.",
      });
    } catch {
      toast.error("Could not start the upgrade. Please try again.");
    } finally {
      setBusy(null);
      refetch();
    }
  }

  async function handleManage() {
    setBusy("manage");
    try {
      const result = await manage();
      if (result.status === "redirect" && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast.info("Subscription management is coming soon");
    } catch {
      toast.error("Could not open subscription management.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="wazen-panel p-7 sm:p-10">
          <p className="wazen-label">Your plan</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl">{PLAN_LABELS[entitlements.plan]}</h1>
            {isPremium ? <PremiumBadge /> : null}
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                entitlements.needsAttention
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {STATUS_LABELS[entitlements.status]}
            </span>
          </div>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {isPremium
              ? entitlements.isCancelling
                ? "Premium stays available until the end of your current period."
                : "You have full access to every Wazen premium feature."
              : "You're on the free plan. Premium unlocks Wazen's deeper financial tools."}
          </p>
          <dl className="mt-7 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="wazen-label">Started</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.startedAt)}</dd>
            </div>
            <div>
              <dt className="wazen-label">Renews</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="wazen-label">Trial ends</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.trialEndsAt)}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            {isPremium ? (
              <button
                onClick={handleManage}
                disabled={busy === "manage"}
                className="rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {busy === "manage" ? "Opening…" : "Manage subscription"}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={busy === "upgrade"}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles className="size-4" strokeWidth={1.5} />
                {busy === "upgrade"
                  ? "Preparing…"
                  : `Upgrade — ${PREMIUM_PRICE.amount.toFixed(3)} ${PREMIUM_PRICE.currency}/${PREMIUM_PRICE.interval}`}
              </button>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="wazen-panel p-7">
            <p className="wazen-label">Free</p>
            <h2 className="mt-3 text-xl">Everything you use today</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {FREE_PLAN_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-sage" strokeWidth={1.5} />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="wazen-panel bg-secondary/40 p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="wazen-label">Premium</p>
              <PremiumBadge />
            </div>
            <h2 className="mt-3 text-xl">Wazen at full depth</h2>
            <ul className="mt-5 space-y-4 text-sm">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <span>
                    <span className="block">{FEATURE_LABELS[feature]}</span>
                    <span className="block text-muted-foreground">
                      {FEATURE_DESCRIPTIONS[feature]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
