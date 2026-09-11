import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, FamilyIcon, PremiumIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { PremiumBadge } from "@/components/wazen/subscription/PremiumGate";
import { useSubscriptionAccess } from "@/hooks/use-subscription";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { cancelPremiumSubscription, startPremiumUpgrade } from "@/lib/subscription.functions";
import {
  PREMIUM_FEATURES,
  computeFamilyTotal,
  findPrice,
  formatMoney,
  formatPlanDate,
} from "@/lib/subscription";
import { useWazenLabels } from "@/lib/i18n-labels";
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

function SubscriptionPage() {
  const { entitlements, isPremium, isLoading, refetch, canSubscribe, canManageBilling, family } =
    useSubscriptionAccess();
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
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
      toast.success(t("premiumActiveToast"), { description: t("premiumActiveToastBody") });
    } catch {
      toast.error(t("upgradeFailed"));
    } finally {
      setBusy(null);
      await refreshPlanEverywhere();
    }
  }

  async function handleManage() {
    setBusy("manage");
    try {
      await cancel({ data: undefined });
      toast.success(t("premiumCancelledToast"), { description: t("premiumCancelledToastBody") });
    } catch {
      toast.error(t("cancelFailed"));
    } finally {
      setBusy(null);
      await refreshPlanEverywhere();
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
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
              {labels.subscriptionStatus(entitlements.status)}
            </span>
            {entitlements.subscriptionKind ? (
              <span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {labels.subscriptionKind(entitlements.subscriptionKind)}
              </span>
            ) : null}
          </div>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {!canSubscribe
              ? isPremium
                ? t("familyCoveredBody")
                : t("guardianManagedBody")
              : isPremium
                ? entitlements.isCancelling
                  ? t("cancellingBody")
                  : t("premiumFullBody")
                : t("freePlanBody")}
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
                  <PremiumIcon className="size-4" strokeWidth={ICON_STROKE} />
                  {busy === "upgrade"
                    ? "…"
                    : `${t("upgrade")} — ${formatMoney(
                        isFamily ? familyMoney.total : (individualPrice?.amount ?? 0),
                        isFamily ? familyMoney.currency : (individualPrice?.currency ?? "KWD"),
                      )}/${labels.billingPeriod(entitlements.billingPeriod ?? "monthly")}`}
                </Button>
              )}
            </div>
          ) : null}
        </section>

        {family ? (
          <section className="border-y border-border py-7">
            <div className="flex items-center gap-3">
              <FamilyIcon className="size-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
              <p className="wazen-label">{t("familySubscriptionLabel")}</p>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-4">
              <div>
                <dt className="wazen-label">{t("parentsLabel")}</dt>
                <dd className="mt-2 text-sm">
                  {family.parentCount} {t("ofWord")} {family.includedParentCount} {t("includedWord")}
                </dd>
              </div>
              <div>
                <dt className="wazen-label">{t("childrenTeensLabel")}</dt>
                <dd className="mt-2 text-sm">
                  {family.childCount} {t("ofWord")} {family.includedChildCount} {t("includedWord")}
                </dd>
              </div>
              <div>
                <dt className="wazen-label">{t("extraChildrenLabel")}</dt>
                <dd className="mt-2 text-sm">{family.additionalChildCount}</dd>
              </div>
              <div>
                <dt className="wazen-label">{t("freePlacesLeft")}</dt>
                <dd className="mt-2 text-sm">{family.remainingIncludedChildSeats}</dd>
              </div>
            </dl>
            {canManageBilling ? (
              <div className="mt-6 space-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
                <p>
                  {t("baseFamilySubscription")} —{" "}
                  {formatMoney(familyMoney.base, familyMoney.currency)}{t("perMonth")}
                </p>
                <p>
                  {additionalChildren}{" "}
                  {additionalChildren === 1 ? t("extraChildWord") : t("extraChildrenWord")} ×{" "}
                  {formatMoney(familyPrice?.additional_child_amount ?? 0, familyMoney.currency)} —{" "}
                  {formatMoney(familyMoney.additional, familyMoney.currency)}{t("perMonth")}
                </p>
                <p className="text-foreground">
                  {t("totalLabel")} — {formatMoney(familyMoney.total, familyMoney.currency)}{t("perMonth")}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="grid border-y border-border lg:grid-cols-2">
          <section className="border-b border-border py-7 lg:border-b-0 lg:border-e lg:pe-8">
            <p className="wazen-label">{t("free")}</p>
            <h2 className="mt-3 text-xl">{t("freePlanTitle")}</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {labels.freeHighlights.map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={ICON_STROKE} />
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
            <h2 className="mt-3 text-xl">{t("premiumPlanTitle")}</h2>
            <ul className="mt-5 space-y-4 text-sm">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <PremiumIcon className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={ICON_STROKE} />
                  <span>
                    <span className="block">{labels.featureLabel(feature)}</span>
                    <span className="block text-muted-foreground">
                      {labels.featureDescription(feature)}
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
              <p className="wazen-label">{t("individualLabel")}</p>
              <h2 className="mt-3 text-xl">
                {formatMoney(individualPrice?.amount ?? 0, individualPrice?.currency ?? "KWD")}
                <span className="text-muted-foreground"> {t("perMonth")}</span>
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {labels.individualHighlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={ICON_STROKE} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section className="py-7 lg:ps-8">
              <p className="wazen-label">{t("familyLabel")}</p>
              <h2 className="mt-3 text-xl">
                {formatMoney(familyPrice?.amount ?? 0, familyPrice?.currency ?? "KWD")}
                <span className="text-muted-foreground"> {t("perMonth")}</span>
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {labels.familyHighlights.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-chart-2" strokeWidth={ICON_STROKE} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">
                {t("extraChildNoteStart")} {familyPrice?.included_child_count ?? 4}{" "}
                {t("extraChildNoteMiddle")}{" "}
                {formatMoney(
                  familyPrice?.additional_child_amount ?? 0,
                  familyPrice?.currency ?? "KWD",
                )}{" "}
                {t("extraChildNoteEnd")}
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
