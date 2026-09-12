import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertIcon,
  CheckIcon,
  PremiumIcon,
  SpinnerIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { formatMoney, type BillingPeriod, type SubscriptionKind } from "@/lib/subscription";

type Stage = "review" | "redirecting" | "not-connected";

/**
 * Frontend-only preparation for the future Stripe Checkout integration.
 *
 * Today this dialog never processes a payment or activates Premium — it only
 * walks the user from "Upgrade" → plan confirmation → "Continue to Payment"
 * → a "redirecting to Stripe Checkout" state, then honestly reports that the
 * live Stripe connection is not wired yet. When Anti-Gravity connects Stripe
 * Test Mode, the "redirecting" stage will be replaced by a real redirect to
 * the Checkout URL returned by the server, and Premium activation will happen
 * through the webhook instead.
 */
export function UpgradeCheckoutDialog({
  open,
  onOpenChange,
  kind,
  billingPeriod,
  total,
  currency,
  kindLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: SubscriptionKind;
  billingPeriod: BillingPeriod;
  total: number;
  currency: string;
  kindLabel: string;
}) {
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
  const [stage, setStage] = useState<Stage>("review");

  // Reset to the review step every time the dialog is opened.
  useEffect(() => {
    if (open) setStage("review");
  }, [open]);

  function handleContinueToPayment() {
    setStage("redirecting");
    // Stripe Checkout is not connected yet. In the future this is where the
    // server will return a Stripe Checkout URL and we will redirect to it.
    window.setTimeout(() => setStage("not-connected"), 2200);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {stage === "review" ? (
          <>
            <DialogHeader>
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-gold/15 text-gold">
                <PremiumIcon className="size-5" strokeWidth={ICON_STROKE} />
              </span>
              <DialogTitle className="text-center">{t("upgradeConfirmTitle")}</DialogTitle>
              <DialogDescription className="text-center">{t("upgradeConfirmBody")}</DialogDescription>
            </DialogHeader>

            <div className="wazen-panel space-y-3 p-4">
              <p className="wazen-label">{t("planSummary")}</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("premium")}</dt>
                  <dd className="font-medium">{kindLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{labels.billingPeriod(billingPeriod)}</dt>
                  <dd className="font-medium">
                    {formatMoney(total, currency)} / {labels.billingPeriod(billingPeriod)}
                  </dd>
                </div>
              </dl>
              <p className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
                <CheckIcon className="size-4 shrink-0 text-chart-2" strokeWidth={ICON_STROKE} />
                {t("premiumFeaturesIncluded")}
              </p>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <PremiumIcon className="size-3.5 text-gold" strokeWidth={ICON_STROKE} />
              {t("stripeSecureNote")}
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleContinueToPayment}>{t("continueToPayment")}</Button>
            </DialogFooter>
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
            <DialogDescription className="max-w-sm">{t("stripeNotConnectedBody")}</DialogDescription>
            <DialogFooter className="w-full sm:justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("closeLabel")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
