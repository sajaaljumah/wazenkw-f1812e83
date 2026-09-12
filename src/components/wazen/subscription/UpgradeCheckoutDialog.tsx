import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertIcon,
  CheckIcon,
  FamilyIcon,
  PremiumIcon,
  SpinnerIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { formatMoney, type BillingPeriod, type SubscriptionKind } from "@/lib/subscription";
import { cn } from "@/lib/utils";

import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCheckoutSessionFn, startPremiumUpgrade } from "@/lib/subscription.functions";

type Stage = "review" | "redirecting" | "not-connected";

export function UpgradeCheckoutDialog({
  open,
  onOpenChange,
  initialKind = "individual",
  billingPeriod = "monthly",
  individualAmount = 2.5,
  familyAmount = 5.0,
  additionalChildren = 0,
  currency = "KWD",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKind?: SubscriptionKind;
  billingPeriod?: BillingPeriod;
  individualAmount?: number;
  familyAmount?: number;
  additionalChildren?: number;
  currency?: string;
}) {
  const { t, isArabic } = useWazenLocale();
  const labels = useWazenLabels();
  const [stage, setStage] = useState<Stage>("review");
  const [selectedKind, setSelectedKind] = useState<SubscriptionKind>(initialKind);
  const [directBusy, setDirectBusy] = useState(false);
  const createCheckout = useServerFn(createCheckoutSessionFn);
  const directUpgrade = useServerFn(startPremiumUpgrade);
  const queryClient = useQueryClient();

  // Sync selectedKind when dialog opens or initialKind changes
  useEffect(() => {
    if (open) {
      setStage("review");
      setSelectedKind(initialKind);
    }
  }, [open, initialKind]);

  const currentTotal =
    selectedKind === "family"
      ? familyAmount + Math.max(0, additionalChildren) * 1.0
      : individualAmount;

  async function handleDirectActivation() {
    setDirectBusy(true);
    try {
      const res = await directUpgrade({
        data: {
          kind: selectedKind,
          billingPeriod,
          additionalChildren: selectedKind === "family" ? additionalChildren : 0,
        },
      });
      if (res?.entitlements) {
        await queryClient.invalidateQueries({ queryKey: ["entitlements"] });
        toast.success(
          isArabic
            ? `تم تفعيل وازن بريميوم (${selectedKind === "family" ? "عائلي" : "فردي"}) وحفظه بنجاح!`
            : `Wazen Premium (${selectedKind}) activated and saved successfully!`,
        );
        onOpenChange(false);
      }
    } catch {
      toast.error(isArabic ? "تعذر تفعيل الاشتراك" : "Failed to activate subscription");
    } finally {
      setDirectBusy(false);
    }
  }

  async function handleContinueToPayment() {
    setStage("redirecting");
    try {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://wazenkw-f1812e83.onrender.com";

      const res = await createCheckout({
        data: {
          kind: selectedKind,
          billingPeriod,
          additionalChildren: selectedKind === "family" ? additionalChildren : 0,
          successUrl: `${origin}/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancelUrl: `${origin}/subscription?canceled=true`,
        },
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setStage("not-connected");
    } catch {
      setStage("not-connected");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full overflow-hidden p-6">
        {stage === "review" ? (
          <>
            <DialogHeader>
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-gold/15 text-gold">
                <PremiumIcon className="size-5" strokeWidth={ICON_STROKE} />
              </span>
              <DialogTitle className="text-center">{t("upgradeConfirmTitle")}</DialogTitle>
              <DialogDescription className="text-center">
                {t("upgradeConfirmBody")}
              </DialogDescription>
            </DialogHeader>

            {/* Plan Selector Toggle (Individual vs Family) */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/70 p-1.5 border border-border/50 w-full">
              <button
                type="button"
                onClick={() => setSelectedKind("individual")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-2 text-center transition-all duration-200 cursor-pointer min-w-0 w-full",
                  selectedKind === "individual"
                    ? "bg-background text-foreground shadow-sm font-semibold border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <PremiumIcon className="size-4 text-gold shrink-0" strokeWidth={ICON_STROKE} />
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {isArabic ? "بريميوم فردي" : "Individual"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {formatMoney(individualAmount, currency)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedKind("family")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-2 text-center transition-all duration-200 cursor-pointer min-w-0 w-full",
                  selectedKind === "family"
                    ? "bg-background text-foreground shadow-sm font-semibold border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FamilyIcon className="size-4 text-primary shrink-0" strokeWidth={ICON_STROKE} />
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {isArabic ? "بريميوم عائلي" : "Family"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {formatMoney(familyAmount, currency)}
                </span>
              </button>
            </div>

            <div className="wazen-panel space-y-3 p-4 w-full">
              <p className="wazen-label">{t("planSummary")}</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("premium")}</dt>
                  <dd className="font-semibold text-foreground">
                    {labels.subscriptionKind(selectedKind)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{labels.billingPeriod(billingPeriod)}</dt>
                  <dd className="font-semibold text-foreground">
                    {formatMoney(currentTotal, currency)} / {labels.billingPeriod(billingPeriod)}
                  </dd>
                </div>
                {selectedKind === "family" && additionalChildren > 0 ? (
                  <div className="flex justify-between gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <dt>{additionalChildren} {t("extraChildrenWord")}</dt>
                    <dd>+{formatMoney(additionalChildren * 1.0, currency)}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
                <CheckIcon className="size-4 shrink-0 text-chart-2" strokeWidth={ICON_STROKE} />
                {selectedKind === "family"
                  ? isArabic
                    ? "يشمل حسابين للوالدين وحتى 4 أطفال مع كافة الميزات"
                    : "Covers 2 parents and up to 4 children with all features"
                  : t("premiumFeaturesIncluded")}
              </p>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <PremiumIcon className="size-3.5 text-gold" strokeWidth={ICON_STROKE} />
              {t("stripeSecureNote")}
            </p>

            <div className="flex flex-col gap-2.5 w-full pt-1">
              <Button
                onClick={handleContinueToPayment}
                className="w-full gap-2 h-11 text-sm font-semibold shadow-md"
              >
                <PremiumIcon className="size-4" strokeWidth={ICON_STROKE} />
                {t("continueToPayment")} ({formatMoney(currentTotal, currency)})
              </Button>

              <div className="flex items-center justify-between gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="px-4 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("cancel")}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDirectActivation}
                  disabled={directBusy}
                  className="gap-1.5 text-xs text-gold hover:text-gold hover:bg-gold/10 font-medium"
                >
                  {directBusy ? (
                    <SpinnerIcon className="size-3.5 animate-spin text-gold" strokeWidth={ICON_STROKE} />
                  ) : (
                    <CheckIcon className="size-3.5 text-gold" strokeWidth={ICON_STROKE} />
                  )}
                  {isArabic ? "تفعيل فوري مباشر" : "Instant Activation"}
                </Button>
              </div>
            </div>
          </>
        ) : stage === "redirecting" ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <SpinnerIcon className="size-8 animate-spin text-gold" strokeWidth={ICON_STROKE} />
            <DialogTitle className="text-xl">{t("redirectingToStripe")}</DialogTitle>
            <DialogDescription className="flex items-center justify-center gap-2">
              <PremiumIcon className="size-3.5 text-gold" strokeWidth={ICON_STROKE} />
              {t("stripeSecureNote")}
            </DialogDescription>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold/15 text-gold">
              <AlertIcon className="size-5" strokeWidth={ICON_STROKE} />
            </span>
            <DialogTitle className="text-xl">{t("stripeNotConnectedTitle")}</DialogTitle>
            <DialogDescription className="max-w-sm">
              {isArabic
                ? "يمكنك تفعيل اشتراك وازن بريميوم مباشرة الآن لحسابك والاستفادة من كافة الميزات:"
                : t("stripeNotConnectedBody")}
            </DialogDescription>
            <div className="w-full flex flex-col gap-2 mt-2">
              <Button
                onClick={handleDirectActivation}
                disabled={directBusy}
                className="w-full gap-2 bg-gold hover:bg-gold/90 text-primary-foreground font-semibold"
              >
                {directBusy ? (
                  <SpinnerIcon className="size-4 animate-spin" strokeWidth={ICON_STROKE} />
                ) : (
                  <PremiumIcon className="size-4" strokeWidth={ICON_STROKE} />
                )}
                {isArabic
                  ? `تفعيل بريميوم (${selectedKind === "family" ? "عائلي" : "فردي"}) مباشرة الآن`
                  : `Activate Premium (${selectedKind}) Directly Now`}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                {t("closeLabel")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
