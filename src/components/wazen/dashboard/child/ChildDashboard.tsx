import { useEffect, useMemo, useRef, useState } from "react";
import { AddIcon, ExpensesIcon, ExpandIcon, GiveIcon, GoalsIcon, IncomeIcon, PremiumIcon, RefundIcon, SavingsIcon, ScheduledIcon, SpendIcon, ICON_STROKE } from "@/components/wazen/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionDialog } from "../quick-actions";
import {
  Celebration,
  CoinIllustration,
  GiftIllustration,
  HeartIllustration,
  KidDecorations,
  SavingsJarIllustration,
  StarBadgeIllustration,
  illustrationForGoal,
} from "./illustrations";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { formatDate, formatMoney, inMonth, monthKey, savedForGoal, totalsFor } from "@/lib/finance";
import type { Goal, Transaction } from "@/lib/finance";
import type { DashboardData } from "../variants";
import type { Gender } from "@/lib/wazen";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { useParentPaidForMe } from "@/hooks/use-wazen-finance";

type ActionKind = "income" | "expense" | "saving" | "give" | "goal";
type Sheet = "spend" | "give" | "goal" | null;

const GIVE_PATTERN = /giv|charity|sadaqah|donat|help/i;

/** Big soft progress bar that eases up to its value whenever it changes. */
function KidProgress({ percent, className }: { percent: number; className?: string }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setWidth(safePercent), 120);
    return () => window.clearTimeout(timer);
  }, [safePercent]);
  return (
    <div
      className={cn("wazen-progress-track h-5 w-full overflow-hidden rounded-full bg-kid-soft/70", className)}
      data-complete={safePercent >= 100 ? "true" : undefined}
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="wazen-progress-fill h-full rounded-full bg-kid-champagne transition-[width] duration-1000 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MoneyTile({
  label,
  amount,
  currency,
  illustration,
  helper,
}: {
  label: string;
  amount: number;
  currency: string;
  illustration: React.ReactNode;
  helper: string;
}) {
  return (
    <div className="kid-panel kid-money-tile relative overflow-hidden p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-kid-deep">{label}</p>
          <p className="mt-2 text-2xl tabular-nums">{formatMoney(amount, currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className="size-14 shrink-0 kid-float">{illustration}</span>
      </div>
    </div>
  );
}

function ChoiceTile({
  title, caption, illustration, onClick,
}: {
  title: string;
  caption: string;
  illustration: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="kid-panel kid-press flex flex-col items-center gap-3 bg-kid-tint p-6 text-center focus-visible:ring-2 focus-visible:ring-kid-mid focus-visible:outline-hidden"
    >
      <span className="size-20">{illustration}</span>
      <span className="text-lg">{title}</span>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </button>
  );
}

const ACTIVITY_ICON: Record<Transaction["kind"], typeof IncomeIcon> = {
  income: IncomeIcon,
  expense: SpendIcon,
  saving: SavingsIcon,
  refund: RefundIcon,
};

const ACTIVITY_KEY: Record<Transaction["kind"], "kidGotMoney" | "kidSpentWord" | "kidSavedMoneyWord" | "kidMoneyBack"> = {
  income: "kidGotMoney",
  expense: "kidSpentWord",
  saving: "kidSavedMoneyWord",
  refund: "kidMoneyBack",
};

export function ChildDashboard({
  data,
  firstName,
  fullName,
  gender,
  avatarUrl,
}: {
  data: DashboardData;
  firstName: string;
  fullName: string;
  gender: Gender;
  avatarUrl: string | null;
}) {
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
  const { currency, transactions, goals, userId } = data;
  const [action, setAction] = useState<ActionKind | null>(null);
  const parentPaid = useParentPaidForMe();
  const [sheet, setSheet] = useState<Sheet>(null);

  const monthTransactions = useMemo(() => inMonth(transactions, monthKey(new Date())), [transactions]);
  const month = totalsFor(monthTransactions);
  const all = totalsFor(transactions);

  const allowance = monthTransactions
    .filter((t) => t.kind === "income" && /allowance|pocket/i.test(t.category))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const give = monthTransactions
    .filter((t) => t.kind === "expense" && GIVE_PATTERN.test(`${t.category} ${t.merchant ?? ""}`))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const goal = goals.find((g) => g.kind === "goal") ?? null;
  const saved = goal ? savedForGoal(transactions, goal.id) : 0;
  const target = goal ? Number(goal.target_amount) : 0;
  const percent = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
  const GoalArt = illustrationForGoal(goal?.name ?? "");

  // Celebrate only real milestones: reaching half, then finishing a goal.
  const [celebrate, setCelebrate] = useState(false);
  const lastMilestone = useRef<number | null>(null);
  useEffect(() => {
    const milestone = percent >= 100 ? 100 : percent >= 50 ? 50 : 0;
    if (lastMilestone.current === null) {
      lastMilestone.current = milestone;
      return;
    }
    if (milestone > lastMilestone.current) {
      lastMilestone.current = milestone;
      setCelebrate(true);
      const timer = window.setTimeout(() => setCelebrate(false), 2200);
      return () => window.clearTimeout(timer);
    }
    lastMilestone.current = milestone;
    return;
  }, [percent]);

  const badges = [
    { label: t("kidBadgeFirstSaving"), earned: all.savings > 0, hint: t("kidBadgeFirstSavingHint") },
    { label: t("kidBadgeGoalStarted"), earned: !!goal, hint: t("kidBadgeGoalStartedHint") },
    { label: t("kidBadgeHalfway"), earned: percent >= 50, hint: t("kidBadgeHalfwayHint") },
    { label: t("kidBadgeKind"), earned: give > 0, hint: t("kidBadgeKindHint") },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  const recent = transactions.slice(0, 5);

  return (
    <div className="kid-theme flex flex-col gap-6">
      {/* Welcome */}
      <section className="kid-panel relative order-0 overflow-hidden bg-kid-tint p-7 sm:p-9">
        <KidDecorations />
        <div className="relative grid grid-cols-1 items-center gap-5 text-center sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-7 sm:text-start">
          <span className="kid-float rounded-full bg-kid-soft/70 p-2">
            <WazenAvatar fullName={fullName} gender={gender} lifeStage="child" avatarUrl={avatarUrl} size={84} />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-kid-deep">{t("kidHi")} {firstName}!</p>
            <h1 className="mt-2 text-3xl sm:text-4xl">{t("kidWorldTitle")}</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("kidWorldBody")}</p>
          </div>
          <button
            type="button"
            onClick={() => setAction("saving")}
             className="kid-press flex w-full items-center justify-center gap-2 rounded-xl bg-kid-deep px-6 py-3 text-sm text-kid-ivory sm:w-auto"
          >
            <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
            {t("kidSaveMoney")}
          </button>
        </div>
      </section>

      {/* My money */}
      <section className="wazen-reveal order-3 space-y-4" data-revealed={r3.revealed} ref={r3.ref}>
        <h2 className="px-1 text-xl">{t("kidMyMoney")}</h2>
        <div className="grid gap-4 min-[520px]:grid-cols-3">
          <MoneyTile
            label={t("kidGot")}
            amount={month.income}
            currency={currency}
            helper={t("kidThisMonth")}
            illustration={<CoinIllustration />}
          />
          <MoneyTile
            label={t("kidSpentLabel")}
            amount={month.expenses}
            currency={currency}
            helper={t("kidThisMonth")}
            illustration={<GiftIllustration />}
          />
          <MoneyTile
            label={t("kidSavedLabel")}
            amount={all.savings}
            currency={currency}
            helper={t("kidKeptSafe")}
            illustration={<SavingsJarIllustration />}
          />
        </div>
      </section>

      {/* Goal */}
      <section className="kid-panel relative order-1 overflow-hidden bg-kid-tint/70 p-7 sm:p-9">
        <Celebration show={celebrate} />
        {goal ? (
          <button
            type="button"
            onClick={() => setSheet("goal")}
             className="relative flex w-full flex-col items-center gap-6 text-center sm:flex-row sm:text-start"
          >
            <span className="size-32 shrink-0 kid-float sm:size-40">
              <GoalArt />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-kid-deep">{t("kidBigGoal")}</span>
              <span className="mt-1 block text-2xl sm:text-3xl">{goal.name}</span>
              <KidProgress percent={percent} className="mt-5" />
              <span className="mt-3 block text-sm text-muted-foreground">
                {formatMoney(saved, currency)} {t("kidGoalSavedOf")} {formatMoney(target, currency)} — {t("kidGoalThere")} {percent}% {t("kidGoalThereEnd")}
              </span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm text-kid-deep">
                <PremiumIcon className="size-4" strokeWidth={ICON_STROKE} />
                {percent >= 100 ? t("kidYouDidIt") : t("kidTapGoal")}
              </span>
            </span>
          </button>
        ) : (
          <div className="relative flex flex-col items-center gap-5 text-center">
            <span className="size-32 kid-float">
              <SavingsJarIllustration />
            </span>
            <p className="text-2xl">{t("kidPickGoal")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("kidPickGoalBody")}</p>
            <button
              type="button"
              onClick={() => setAction("goal")}
               className="kid-press rounded-xl bg-kid-deep px-6 py-3 text-sm text-kid-ivory"
            >
              {t("kidMakeGoal")}
            </button>
          </div>
        )}
      </section>

      {/* Save / Spend / Give */}
      <section className="wazen-reveal order-2 space-y-4" data-revealed={r2.revealed} ref={r2.ref}>
        <h2 className="px-1 text-xl">{t("kidWhatDo")}</h2>
        <div className="grid gap-4 min-[520px]:grid-cols-3">
          <ChoiceTile
            title={t("kidSave")}
            caption={`${formatMoney(all.savings, currency)} ${t("kidSavedCaption")}`}
            illustration={<SavingsJarIllustration />}
            onClick={() => setAction("saving")}
          />
          <ChoiceTile
            title={t("kidSpend")}
            caption={`${formatMoney(month.expenses, currency)} ${t("kidThisMonthCaption")}`}
            illustration={<GiftIllustration />}
            onClick={() => setSheet("spend")}
          />
          <ChoiceTile
            title={t("kidGive")}
            caption={give > 0 ? `${formatMoney(give, currency)} ${t("kidSharedCaption")}` : t("kidLearnSharing")}
            illustration={<HeartIllustration />}
            onClick={() => setSheet("give")}
          />
        </div>
      </section>

      {/* Allowance + badges */}
      <div className="order-4 grid gap-4 lg:grid-cols-2">
        <section className="kid-panel wazen-reveal relative overflow-hidden p-6" data-revealed={r4.revealed} ref={r4.ref}>
          <div className="flex items-center gap-4">
            <span className="size-14 kid-float">
              <CoinIllustration />
            </span>
            <div>
              <p className="text-sm text-kid-deep">{t("kidAllowance")}</p>
              <p className="mt-1 text-2xl tabular-nums">{formatMoney(allowance, currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("kidPocketMoney")}</p>
            </div>
          </div>
        </section>

        <section className="kid-panel wazen-reveal p-6" data-revealed={r5.revealed} ref={r5.ref}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-kid-deep">{t("kidMyStars")}</p>
            <p className="text-xs text-muted-foreground">
              {earnedCount} {t("ofWord")} {badges.length}
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((badge) => (
              <li
                key={badge.label}
                title={badge.hint}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-3xl p-3 text-center text-xs",
                  badge.earned ? "kid-earned bg-kid-soft/60 kid-pop" : "bg-secondary/50 opacity-55",
                )}
              >
                <span className="size-10">
                  <StarBadgeIllustration />
                </span>
                {badge.label}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent activity */}
      <details open className="kid-panel group order-5 p-6">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 focus-visible:outline-hidden">
          <span className="min-w-0">
            <span className="block text-xl font-semibold">{t("kidLately")}</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">{t("kidLatelyHint")}</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kid-soft/70 text-kid-deep transition-transform group-open:rotate-180">
            <ExpandIcon className="size-4" strokeWidth={ICON_STROKE} />
          </span>
        </summary>
        <div className="mt-5 border-t border-kid-soft pt-5">
        {recent.length === 0 ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-kid-tint/70 p-8 text-center">
            <span className="size-20">
              <SavingsJarIllustration />
            </span>
            <p>{t("kidNothingYet")}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t("kidNothingYetBody")}</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {recent.map((item) => {
              const Icon = ACTIVITY_ICON[item.kind];
              const isOut = item.kind === "expense";
              return (
                <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-kid-tint/60 p-4 min-[420px]:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-kid-soft/80 text-kid-deep">
                    <Icon className="size-5" strokeWidth={ICON_STROKE} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {t(ACTIVITY_KEY[item.kind])} — {labels.merchant(item.merchant) || labels.category(item.category)}
                    </span>
                    <span className="block text-xs text-muted-foreground">{formatDate(item.occurred_on)}</span>
                  </span>
                  <span className={cn("col-start-2 text-sm tabular-nums min-[420px]:col-start-3", isOut ? "text-kid-deep" : "text-foreground")}>
                    {isOut ? "−" : "+"}
                    {formatMoney(Number(item.amount), currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </details>

      {/* Things a parent paid for this child. Not deducted from their own money
          unless the parent chose to. */}
      <details className="kid-panel group order-6 p-6">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 focus-visible:outline-hidden">
          <span className="min-w-0">
            <span className="block text-xl font-semibold">{t("kidPaidByFamily")}</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">{t("kidPaidByFamilyHint")}</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-kid-soft/70 text-kid-deep transition-transform group-open:rotate-180">
            <ExpandIcon className="size-4" strokeWidth={ICON_STROKE} />
          </span>
        </summary>
        <div className="mt-5 border-t border-kid-soft pt-5">
        {(parentPaid.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("kidPaidByFamilyBody")}</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {(parentPaid.data ?? []).slice(0, 5).map((item) => (
              <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-kid-tint/60 p-4 min-[420px]:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-kid-soft/80 text-kid-deep">
                  <GiveIcon className="size-5" strokeWidth={ICON_STROKE} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{labels.merchant(item.merchant) || labels.category(item.category)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(item.occurred_on)} ·{" "}
                    {item.deducted_from_child ? t("kidFromYourMoney") : t("kidFamilyPaid")}
                  </span>
                </span>
                <span className="col-start-2 text-sm tabular-nums min-[420px]:col-start-3">
                  {formatMoney(Number(item.amount), item.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
        </div>
      </details>

      <ActionDialog
        kind={action}
        onClose={() => setAction(null)}
        userId={userId}
        currency={currency}
        goals={goals}
      />

      <SpendSheet
        open={sheet === "spend"}
        onClose={() => setSheet(null)}
        transactions={monthTransactions}
        currency={currency}
        onAddExpense={() => {
          setSheet(null);
          setAction("expense");
        }}
      />
      <GiveSheet
        open={sheet === "give"}
        onClose={() => setSheet(null)}
        given={give}
        currency={currency}
        onAddGiving={() => {
          setSheet(null);
          setAction("give");
        }}
      />

      <GoalSheet
        open={sheet === "goal"}
        onClose={() => setSheet(null)}
        goal={goal}
        saved={saved}
        percent={percent}
        currency={currency}
        onAddSaving={() => {
          setSheet(null);
          setAction("saving");
        }}
      />
    </div>
  );
}

function SheetShell({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="rounded-[2rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function SpendSheet({
  open,
  onClose,
  transactions,
  currency,
  onAddExpense,
}: {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: string;
  onAddExpense: () => void;
}) {
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
  const spending = transactions.filter((item) => item.kind === "expense");
  return (
    <SheetShell open={open} onClose={onClose} title={t("kidSpendSheetTitle")} description={t("kidSpendSheetBody")}>
      {spending.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("kidNoSpending")}</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {spending.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <ExpensesIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={ICON_STROKE} />
                <span className="truncate">{labels.merchant(item.merchant) || labels.category(item.category)}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatMoney(Number(item.amount), currency)}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onAddExpense}
        className="mt-2 w-full rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
      >
        {t("kidAddSpent")}
      </button>
    </SheetShell>
  );
}

function GiveSheet({
  open,
  onClose,
  given,
  currency,
  onAddGiving,
}: {
  open: boolean;
  onClose: () => void;
  given: number;
  currency: string;
  onAddGiving: () => void;
}) {
  const { t } = useWazenLocale();
  return (
    <SheetShell
      open={open}
      onClose={onClose}
      title={t("kidGiveTitle")}
      description={t("kidGiveBody")}
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-4 rounded-3xl bg-secondary/50 p-4">


          <span className="size-14 shrink-0">
            <HeartIllustration />
          </span>
          <p>
            {t("kidGiveSummaryStart")} <span className="tabular-nums">{formatMoney(given, currency)}</span>{" "}
            {t("kidGiveSummaryEnd")}
          </p>
        </div>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2">
            <GiveIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> {t("kidGiveTip1")}
          </li>
          <li className="flex gap-2">
            <ScheduledIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> {t("kidGiveTip2")}
          </li>
          <li className="flex gap-2">
            <PremiumIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> {t("kidGiveTip3")}
          </li>
        </ul>
        <button
          type="button"
          onClick={onAddGiving}
          className="kid-press w-full rounded-xl bg-kid-deep px-6 py-3 text-sm text-kid-ivory"
        >
          {t("kidGaveSomething")}
        </button>
      </div>

    </SheetShell>
  );
}

function GoalSheet({
  open,
  onClose,
  goal,
  saved,
  percent,
  currency,
  onAddSaving,
}: {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  saved: number;
  percent: number;
  currency: string;
  onAddSaving: () => void;
}) {
  const { t } = useWazenLocale();
  if (!goal) return null;
  const Art = illustrationForGoal(goal.name);
  const left = Math.max(Number(goal.target_amount) - saved, 0);
  return (
    <SheetShell open={open} onClose={onClose} title={goal.name} description={t("kidGoalSheetBody")}>
      <div className="space-y-5 text-sm">
        <span className="mx-auto block size-28">
          <Art />
        </span>
        <KidProgress percent={percent} />
        <p className="text-center">
          {formatMoney(saved, currency)} {t("kidSavedCaption")} —{" "}
          {left > 0 ? `${formatMoney(left, currency)} ${t("kidToGo")}` : t("kidGoalComplete")}
        </p>
        <button
          type="button"
          onClick={onAddSaving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          <GoalsIcon className="size-4" strokeWidth={ICON_STROKE} />
          {t("kidAddToGoal")}
        </button>
      </div>
    </SheetShell>
  );
}
