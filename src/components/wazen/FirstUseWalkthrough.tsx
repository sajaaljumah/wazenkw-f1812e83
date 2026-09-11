import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BudgetIcon, GoalsIcon, SavingsIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import type { LifeStage } from "@/lib/wazen";

const TOUR_VERSION = "v1";

function keyFor(userId: string) {
  return `wazen.walkthrough.${TOUR_VERSION}.${userId}`;
}

export function FirstUseWalkthrough({ userId, eligible, lifeStage }: { userId: string; eligible: boolean; lifeStage: LifeStage }) {
  const { t } = useWazenLocale();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    try {
      setOpen(localStorage.getItem(keyFor(userId)) !== "done");
    } catch {
      setOpen(true);
    }
  }, [eligible, userId]);

  const complete = () => {
    try {
      localStorage.setItem(keyFor(userId), "done");
    } catch {
      /* The walkthrough still closes when storage is unavailable. */
    }
    setOpen(false);
  };

  const childLike = lifeStage === "child" || lifeStage === "teenager";
  const steps = [
    { title: t("tourWelcomeTitle"), body: childLike ? t("tourWelcomeYoungBody") : t("tourWelcomeBody"), icon: BudgetIcon },
    { title: t("tourUnderstandTitle"), body: t("tourUnderstandBody"), icon: BudgetIcon },
    { title: t("tourPlanTitle"), body: childLike ? t("tourPlanYoungBody") : t("tourPlanBody"), icon: GoalsIcon },
    { title: t("tourGrowTitle"), body: childLike ? t("tourGrowYoungBody") : t("tourGrowBody"), icon: SavingsIcon },
  ];
  const current = steps[step] ?? steps[0];
  if (!current) return null;
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? complete() : undefined)}>
      <DialogContent className="max-w-md overflow-hidden p-0" aria-describedby="walkthrough-description">
        <div className="bg-accent/55 px-6 pb-7 pt-8 sm:px-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Icon className="size-5" strokeWidth={ICON_STROKE} />
          </div>
          <p className="wazen-label mt-6">{t("tourStep")} {step + 1} {t("ofWord")} {steps.length}</p>
          <DialogTitle className="mt-2 text-2xl sm:text-3xl">{current.title}</DialogTitle>
          <DialogDescription id="walkthrough-description" className="mt-3 text-sm leading-relaxed">{current.body}</DialogDescription>
        </div>
        <div className="px-6 pb-6 sm:px-8">
          <div className="mb-6 flex gap-2" aria-hidden>
            {steps.map((item, index) => <span key={item.title} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-secondary"}`} />)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={complete}>{t("tourSkip")}</Button>
            <div className="flex gap-2">
              {step > 0 ? <Button variant="outline" onClick={() => setStep((value) => value - 1)}>{t("backLabel")}</Button> : null}
              <Button onClick={() => step === steps.length - 1 ? complete() : setStep((value) => value + 1)}>
                {step === steps.length - 1 ? t("tourFinish") : t("continueLabel")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}