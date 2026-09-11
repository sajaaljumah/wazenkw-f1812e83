import { useEffect, useMemo, useRef, useState } from "react";
import { AddIcon, ExpensesIcon, GiveIcon, GoalsIcon, IncomeIcon, PremiumIcon, RefundIcon, SavingsIcon, ScheduledIcon, SpendIcon, ICON_STROKE } from "@/components/wazen/icons";
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
import { cn } from "@/lib/utils";

type ActionKind = "income" | "expense" | "saving" | "goal";
type Sheet = "spend" | "give" | "goal" | null;

const GIVE_PATTERN = /giv|charity|sadaqah|donat|help/i;

/** Big soft progress bar that eases up to its value whenever it changes. */
function KidProgress({ percent, className }: { percent: number; className?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setWidth(percent), 120);
    return () => window.clearTimeout(timer);
  }, [percent]);
  return (
    <div
      className={cn("h-5 w-full overflow-hidden rounded-full bg-kid-soft/70", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-kid-champagne transition-[width] duration-1000 ease-out"
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
    <div className="kid-panel relative overflow-hidden p-6">
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

const ACTIVITY_WORD: Record<Transaction["kind"], string> = {
  income: "You got money",
  expense: "You spent",
  saving: "You saved",
  refund: "Money came back",
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
  const { currency, transactions, goals, userId } = data;
  const [action, setAction] = useState<ActionKind | null>(null);
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
    { label: "First saving", earned: all.savings > 0, hint: "You saved money once" },
    { label: "Goal started", earned: !!goal, hint: "You made a savings goal" },
    { label: "Halfway hero", earned: percent >= 50, hint: "Half of your goal saved" },
    { label: "Kind heart", earned: give > 0, hint: "You gave to someone" },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  const themeClass = gender === "female" ? "kid-female" : "kid-male";
  const recent = transactions.slice(0, 5);

  return (
    <div className={cn(themeClass, "space-y-6")}>
      {/* Welcome */}
      <section className="kid-panel relative overflow-hidden bg-kid-tint p-7 sm:p-9">
        <KidDecorations />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
          <span className="kid-float rounded-full bg-kid-soft/70 p-2">
            <WazenAvatar fullName={fullName} gender={gender} lifeStage="child" avatarUrl={avatarUrl} size={84} />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-kid-deep">Hi {firstName}!</p>
            <h1 className="mt-2 text-3xl sm:text-4xl">This is your money world</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Save a little, spend wisely, and share some kindness.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAction("saving")}
               className="kid-press sm:ms-auto flex items-center gap-2 rounded-xl bg-kid-deep px-6 py-3 text-sm text-kid-ivory"
          >
            <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
            Save money
          </button>
        </div>
      </section>

      {/* My money */}
      <section className="space-y-4">
        <h2 className="px-1 text-xl">My money</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyTile
            label="Money I got"
            amount={month.income}
            currency={currency}
            helper="This month"
            illustration={<CoinIllustration />}
          />
          <MoneyTile
            label="Money I spent"
            amount={month.expenses}
            currency={currency}
            helper="This month"
            illustration={<GiftIllustration />}
          />
          <MoneyTile
            label="Money I saved"
            amount={all.savings}
            currency={currency}
            helper="Kept safe for later"
            illustration={<SavingsJarIllustration />}
          />
        </div>
      </section>

      {/* Goal */}
      <section className="kid-panel relative overflow-hidden bg-kid-tint/70 p-7 sm:p-9">
        <Celebration show={celebrate} />
        {goal ? (
          <button
            type="button"
            onClick={() => setSheet("goal")}
            className="relative flex w-full flex-col items-center gap-6 text-center sm:flex-row sm:text-left"
          >
            <span className="size-32 shrink-0 kid-float sm:size-40">
              <GoalArt />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-kid-deep">My big goal</span>
              <span className="mt-1 block text-2xl sm:text-3xl">{goal.name}</span>
              <KidProgress percent={percent} className="mt-5" />
              <span className="mt-3 block text-sm text-muted-foreground">
                {formatMoney(saved, currency)} saved of {formatMoney(target, currency)} — you are {percent}% there!
              </span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm text-kid-deep">
                <PremiumIcon className="size-4" strokeWidth={ICON_STROKE} />
                {percent >= 100 ? "You did it!" : "Tap to see your goal"}
              </span>
            </span>
          </button>
        ) : (
          <div className="relative flex flex-col items-center gap-5 text-center">
            <span className="size-32 kid-float">
              <SavingsJarIllustration />
            </span>
            <p className="text-2xl">Pick something to save for</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              A bike, a game, a trip — choose your dream and watch your jar fill up.
            </p>
            <button
              type="button"
              onClick={() => setAction("goal")}
               className="kid-press rounded-xl bg-kid-deep px-6 py-3 text-sm text-kid-ivory"
            >
              Make a goal
            </button>
          </div>
        )}
      </section>

      {/* Save / Spend / Give */}
      <section className="space-y-4">
        <h2 className="px-1 text-xl">What do you want to do?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ChoiceTile
            title="Save"
            caption={`${formatMoney(all.savings, currency)} saved`}
            illustration={<SavingsJarIllustration />}
            onClick={() => setAction("saving")}
          />
          <ChoiceTile
            title="Spend"
            caption={`${formatMoney(month.expenses, currency)} this month`}
            illustration={<GiftIllustration />}
            onClick={() => setSheet("spend")}
          />
          <ChoiceTile
            title="Give"
            caption={give > 0 ? `${formatMoney(give, currency)} shared` : "Learn about sharing"}
            illustration={<HeartIllustration />}
            onClick={() => setSheet("give")}
          />
        </div>
      </section>

      {/* Allowance + badges */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="kid-panel relative overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <span className="size-14 kid-float">
              <CoinIllustration />
            </span>
            <div>
              <p className="text-sm text-kid-deep">My allowance</p>
              <p className="mt-1 text-2xl tabular-nums">{formatMoney(allowance, currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pocket money this month</p>
            </div>
          </div>
        </section>

        <section className="kid-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-kid-deep">My stars</p>
            <p className="text-xs text-muted-foreground">
              {earnedCount} of {badges.length}
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((badge) => (
              <li
                key={badge.label}
                title={badge.hint}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-3xl p-3 text-center text-xs",
                  badge.earned ? "bg-kid-soft/60 kid-pop" : "bg-secondary/50 opacity-55",
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
      <section className="kid-panel p-6">
        <h2 className="text-xl">What happened lately</h2>
        {recent.length === 0 ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-kid-tint/70 p-8 text-center">
            <span className="size-20">
              <SavingsJarIllustration />
            </span>
            <p>Nothing here yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              When you get, spend or save money, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {recent.map((item) => {
              const Icon = ACTIVITY_ICON[item.kind];
              const isOut = item.kind === "expense";
              return (
                <li key={item.id} className="flex items-center gap-4 rounded-3xl bg-kid-tint/60 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-kid-soft/80 text-kid-deep">
                    <Icon className="size-5" strokeWidth={ICON_STROKE} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {ACTIVITY_WORD[item.kind]} — {item.merchant ?? item.category}
                    </span>
                    <span className="block text-xs text-muted-foreground">{formatDate(item.occurred_on)}</span>
                  </span>
                  <span className={cn("shrink-0 text-sm tabular-nums", isOut ? "text-kid-deep" : "text-foreground")}>
                    {isOut ? "−" : "+"}
                    {formatMoney(Number(item.amount), currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
      <GiveSheet open={sheet === "give"} onClose={() => setSheet(null)} given={give} currency={currency} />
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
  const spending = transactions.filter((t) => t.kind === "expense");
  return (
    <SheetShell open={open} onClose={onClose} title="What I spent" description="Everything you spent this month.">
      {spending.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't spent anything this month.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {spending.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/50 px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <ExpensesIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={ICON_STROKE} />
                <span className="truncate">{item.merchant ?? item.category}</span>
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
        Add something I spent
      </button>
    </SheetShell>
  );
}

function GiveSheet({
  open,
  onClose,
  given,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  given: number;
  currency: string;
}) {
  return (
    <SheetShell
      open={open}
      onClose={onClose}
      title="Giving & kindness"
      description="Sadaqah means sharing a little of what you have to help others."
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-4 rounded-3xl bg-secondary/50 p-4">
          <span className="size-14 shrink-0">
            <HeartIllustration />
          </span>
          <p>
            You shared <span className="tabular-nums">{formatMoney(given, currency)}</span> this month. Every small
            amount counts.
          </p>
        </div>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2">
            <GiveIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> Give a small part of your allowance.
          </li>
          <li className="flex gap-2">
            <ScheduledIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> Choose one day each month to share.
          </li>
          <li className="flex gap-2">
            <PremiumIcon className="mt-0.5 size-4 shrink-0" strokeWidth={ICON_STROKE} /> Kind words and help count too.
          </li>
        </ul>
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
  if (!goal) return null;
  const Art = illustrationForGoal(goal.name);
  const left = Math.max(Number(goal.target_amount) - saved, 0);
  return (
    <SheetShell open={open} onClose={onClose} title={goal.name} description="Here is how your goal is going.">
      <div className="space-y-5 text-sm">
        <span className="mx-auto block size-28">
          <Art />
        </span>
        <KidProgress percent={percent} />
        <p className="text-center">
          {formatMoney(saved, currency)} saved — {left > 0 ? `${formatMoney(left, currency)} to go!` : "Goal complete!"}
        </p>
        <button
          type="button"
          onClick={onAddSaving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
        >
          <GoalsIcon className="size-4" strokeWidth={ICON_STROKE} />
          Add to this goal
        </button>
      </div>
    </SheetShell>
  );
}
