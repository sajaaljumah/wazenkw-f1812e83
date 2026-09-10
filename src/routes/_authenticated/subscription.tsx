import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { PremiumBadge } from "@/components/wazen/subscription/PremiumGate";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { cancelPremiumSubscription, startPremiumUpgrade } from "@/lib/subscription.functions";
import {
  FAMILY_PLAN_HIGHLIGHTS,
  FEATURE_DESCRIPTIONS,
  FEATURE_LABELS,
  FREE_PLAN_HIGHLIGHTS,
  INDIVIDUAL_PLAN_HIGHLIGHTS,
  KIND_LABELS,
  PERIOD_LABELS,
  PREMIUM_FEATURES,
  computeFamilyTotal,
  findPrice,
  formatMoney,
  formatPlanDate,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
  head: () => ({
    meta: [
      { title: "Your Wazen plan — Individual & Family" },
      {
        name: "description",
        content:
          "Review your Wazen plan, subscription status and renewal date, and see what the Individual and Family subscriptions include.",
      },
      { property: "og:title", content: "Your Wazen plan — Individual & Family" },
      {
        property: "og:description",
        content: "Manage your Wazen subscription, family seats and premium access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Translate = (key: "statusActive" | "statusInactive" | "statusCancelled" | "statusPastDue" | "statusTrialing") => string;

function statusLabel(status: string, t: Translate): string {
  switch (status) {
    case "active":
      return t("statusActive");
    case "trialing":
      return t("statusTrialing");
    case "cancelled":
      return t("statusCancelled");
    case "past_due":
      return t("statusPastDue");
    default:
      return t("statusInactive");
  }
}

function SubscriptionPage() {
  const { entitlements, isPremium, isLoading, refetch, canSubscribe, canManageBilling, family } =
    useSubscriptionAccess();
  const { t } = useWazenLocale();
  const upgrade = useServerFn(startPremiumUpgrade);
  const cancel = useServerFn(cancelPremiumSubscription);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"upgrade" | "manage" | null>(null);

  const isFamily = entitlements.subscriptionKind === "family" || !!family;
  const individualPrice = findPrice(entitlements.prices, "individual", "monthly");
  const familyPrice = findPrice(entitlements.prices, "family", "monthly");
  const additionalChildren = Math.max(
    0,
    (family?.childCount ?? 0) - (family?.includedChildCount ?? 0),
  );
  const familyMoney = computeFamilyTotal(familyPrice, additionalChildren);

  /** Refreshes every place the plan status is shown (header, profile, settings). */
  async function refreshPlanEverywhere() {
    await queryClient.invalidateQueries({ queryKey: ["entitlements"] });
    await refetch();
  }

  async function handleUpgrade() {
    setBusy("upgrade");
    try {
      const result = await upgrade({
        data: {
          kind: isFamily ? "family" : "individual",
          billingPeriod: "monthly",
          additionalChildren,
        },
      });
      if (result.status === "redirect" && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast.success("Premium is active", {
        description: "Your account has been upgraded from Free to Premium.",
      });
    } catch {
      toast.error("Could not start the upgrade. Please try again.");
    } finally {
      setBusy(null);
      await refreshPlanEverywhere();
    }
  }

  async function handleManage() {
    setBusy("manage");
    try {
      await cancel({ data: undefined });
      toast.success("Premium cancelled", {
        description: "Your account is back on the Free plan.",
      });
    } catch {
      toast.error("Could not update your subscription. Please try again.");
    } finally {
      setBusy(null);
      await refreshPlanEverywhere();
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
      <div className="space-y-10 wazen-enter">
        <section className="border-b border-border pb-9">
          <p className="wazen-label">{t("yourPlan")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl">{isPremium ? t("premium") : t("free")}</h1>
            {isPremium ? <PremiumBadge /> : null}
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                entitlements.needsAttention
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {statusLabel(entitlements.status, t)}
            </span>
            {entitlements.subscriptionKind ? (
              <span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {KIND_LABELS[entitlements.subscriptionKind]}
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {!canSubscribe
              ? isPremium
                ? "Your access is included in your family's subscription — nothing to pay and nothing to manage."
                : "Your access is managed by your parent or guardian."
              : isPremium
                ? entitlements.isCancelling
                  ? "Premium stays available until the end of your current period."
                  : "You have full access to every Wazen premium feature."
                : "You're on the free plan. Premium unlocks Wazen's deeper financial tools."}
          </p>
          <dl className="mt-7 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="wazen-label">{t("started")}</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.startedAt)}</dd>
            </div>
            <div>
              <dt className="wazen-label">{t("renews")}</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.renewalAt)}</dd>
            </div>
            <div>
              <dt className="wazen-label">{t("trialEnds")}</dt>
              <dd className="mt-2 text-sm">{formatPlanDate(entitlements.trialEndsAt)}</dd>
            </div>
          </dl>
          {canSubscribe ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {isPremium ? (
                canManageBilling ? (
                  <Button
                    onClick={handleManage}
                    disabled={busy === "manage"}
                    variant="outline"
                  >
                    {busy === "manage" ? "…" : t("manageSubscription")}
                  </Button>
                ) : null
              ) : (
                <Button
                  onClick={handleUpgrade}
                  disabled={busy === "upgrade"}
                >
                  <Sparkles className="size-4" strokeWidth={1.5} />
                  {busy === "upgrade"
                    ? "…"
                    : `${t("upgrade")} — ${formatMoney(
                        isFamily ? familyMoney.total : (individualPrice?.amount ?? 0),
                        isFamily ? familyMoney.currency : (individualPrice?.currency ?? "KWD"),
                      )}/${PERIOD_LABELS[entitlements.billingPeriod ?? "monthly"]}`}
                </Button>
              )}
            </div>
          ) : null}
        </section>

        {family ? (
          <section className="border-y border-border py-7">
            <div className="flex items-center gap-3">
              <Users className="size-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="wazen-label">Family subscription</p>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-4">
              <div>
                <dt className="wazen-label">Parents</dt>
                <dd className="mt-2 text-sm">
                  {family.parentCount} of {family.includedParentCount} included
                </dd>
              </div>
              <div>
                <dt className="wazen-label">Children & teens</dt>
                <dd className="mt-2 text-sm">
                  {family.childCount} of {family.includedChildCount} included
                </dd>
              </div>
              <div>
                <dt className="wazen-label">Extra children</dt>
                <dd className="mt-2 text-sm">{family.additionalChildCount}</dd>
              </div>
              <div>
                <dt className="wazen-label">Free places left</dt>
                <dd className="mt-2 text-sm">{family.remainingIncludedChildSeats}</dd>
              </div>
            </dl>
            {canManageBilling ? (
              <div className="mt-6 space-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
                <p>
                  Base family subscription —{" "}
                  {formatMoney(familyMoney.base, familyMoney.currency)}/month
                </p>
                <p>
                  {additionalChildren} extra{" "}
                  {additionalChildren === 1 ? "child" : "children"} ×{" "}
                  {formatMoney(familyPrice?.additional_child_amount ?? 0, familyMoney.currency)} —{" "}
                  {formatMoney(familyMoney.additional, familyMoney.currency)}/month
                </p>
                <p className="text-foreground">
                  Total — {formatMoney(familyMoney.total, familyMoney.currency)}/month
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid border-y border-border lg:grid-cols-2">
          <section className="border-b border-border py-7 lg:border-b-0 lg:border-e lg:pe-8">
            <p className="wazen-label">{t("free")}</p>
            <h2 className="mt-3 text-xl">Everything you use today</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {FREE_PLAN_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={1.5} />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="py-7 lg:ps-8">
            <div className="flex items-center justify-between gap-3">
              <p className="wazen-label">{t("premium")}</p>
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

        {canSubscribe ? (
          <div className="grid border-y border-border lg:grid-cols-2">
            <section className="border-b border-border py-7 lg:border-b-0 lg:border-e lg:pe-8">
              <p className="wazen-label">Individual</p>
              <h2 className="mt-3 text-xl">
                {formatMoney(individualPrice?.amount ?? 0, individualPrice?.currency ?? "KWD")}
                <span className="text-muted-foreground"> /month</span>
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {INDIVIDUAL_PLAN_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={1.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section className="py-7 lg:ps-8">
              <p className="wazen-label">Family</p>
              <h2 className="mt-3 text-xl">
                {formatMoney(familyPrice?.amount ?? 0, familyPrice?.currency ?? "KWD")}
                <span className="text-muted-foreground"> /month</span>
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {FAMILY_PLAN_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={1.5} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">
                Each child or teenager beyond{" "}
                {familyPrice?.included_child_count ?? 4} costs{" "}
                {formatMoney(
                  familyPrice?.additional_child_amount ?? 0,
                  familyPrice?.currency ?? "KWD",
                )}
                /month.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
