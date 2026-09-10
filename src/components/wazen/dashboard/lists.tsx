import { ArrowDownLeft, ArrowUpRight, CalendarClock, PiggyBank, Receipt, Target, Undo2 } from "lucide-react";
import { EmptyState, Panel, ProgressBar, percentOf } from "./primitives";
import {
  TRANSACTION_KIND_LABELS,
  formatDate,
  formatMoney,
  savedForGoal,
  upcomingCashFlow,
} from "@/lib/finance";
import type { Goal, RecurringItem, Transaction } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function RecentTransactionsCard({
  transactions,
  currency,
  limit = 6,
  title = "Recent transactions",
}: {
  transactions: Transaction[];
  currency: string;
  limit?: number;
  title?: string;
}) {
  const recent = transactions.slice(0, limit);
  return (
    <Panel title={title}>
      {recent.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-5" strokeWidth={1.5} />}
          title="No transactions yet"
          description="Use the quick actions above to record your first income or expense."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {recent.map((t) => {
            const isPositive = t.kind === "income" || t.kind === "refund";
            const Icon =
              t.kind === "income"
                ? ArrowDownLeft
                : t.kind === "refund"
                  ? Undo2
                  : t.kind === "saving"
                    ? PiggyBank
                    : ArrowUpRight;
            return (
              <li key={t.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                    isPositive ? "bg-chart-2/12 text-chart-2" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.merchant || t.category}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {TRANSACTION_KIND_LABELS[t.kind]} · {t.category} · {formatDate(t.occurred_on)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    isPositive ? "text-chart-2" : "text-foreground",
                  )}
                >
                  {isPositive ? "+" : "−"}
                  {formatMoney(Number(t.amount), t.currency || currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function UpcomingCashFlowCard({
  items,
  currency,
  title = "Upcoming income & payments",
}: {
  items: RecurringItem[];
  currency: string;
  title?: string;
}) {
  const upcoming = upcomingCashFlow(items).slice(0, 6);
  return (
    <Panel title={title}>
      {upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-5" strokeWidth={1.5} />}
          title="Nothing scheduled"
          description="Recurring income, bills and saving transfers will be listed here."
        />
      ) : (
        <ul className="space-y-3">
          {upcoming.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{entry.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.kind === "income" ? "Income" : entry.kind === "saving" ? "Saving transfer" : "Recurring expense"}{" "}
                  · {formatDate(entry.date)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  entry.kind === "income" ? "text-chart-2" : "text-foreground",
                )}
              >
                {entry.kind === "income" ? "+" : "−"}
                {formatMoney(entry.amount, entry.currency || currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function GoalsCard({
  goals,
  transactions,
  currency,
  title = "Savings goals",
  playful = false,
}: {
  goals: Goal[];
  transactions: Transaction[];
  currency: string;
  title?: string;
  playful?: boolean;
}) {
  const list = goals.filter((goal) => goal.kind === "goal");
  return (
    <Panel title={title}>
      {list.length === 0 ? (
        <EmptyState
          icon={<Target className="size-5" strokeWidth={1.5} />}
          title="No goals yet"
          description="Create a goal and every saving transfer will move the bar forward."
        />
      ) : (
        <ul className="space-y-6">
          {list.map((goal) => {
            const saved = savedForGoal(transactions, goal.id);
            const percent = percentOf(saved, Number(goal.target_amount));
            return (
              <li key={goal.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={cn("text-sm", playful && "text-base")}>{goal.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatMoney(saved, goal.currency || currency)} of{" "}
                    {formatMoney(Number(goal.target_amount), goal.currency || currency)}
                  </span>
                </div>
                <ProgressBar
                  value={saved}
                  max={Number(goal.target_amount)}
                  tone={playful ? "sage" : "gold"}
                  className={playful ? "mt-3 h-4" : "mt-3"}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {percent}% saved
                  {goal.target_date ? ` · target ${formatDate(goal.target_date)}` : ""}
                  {playful && percent >= 100 ? " · goal reached!" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function EmergencyFundCard({
  goals,
  transactions,
  currency,
}: {
  goals: Goal[];
  transactions: Transaction[];
  currency: string;
}) {
  const fund = goals.find((goal) => goal.kind === "emergency_fund");
  return (
    <Panel title="Emergency fund">
      {!fund ? (
        <EmptyState
          icon={<PiggyBank className="size-5" strokeWidth={1.5} />}
          title="No emergency fund yet"
          description="Add a goal named for your emergency fund to start tracking your safety net."
        />
      ) : (
        <>
          <p className="text-2xl tabular-nums">
            {formatMoney(savedForGoal(transactions, fund.id), fund.currency || currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of {formatMoney(Number(fund.target_amount), fund.currency || currency)} target
          </p>
          <ProgressBar
            value={savedForGoal(transactions, fund.id)}
            max={Number(fund.target_amount)}
            tone="sage"
            className="mt-4"
          />
        </>
      )}
    </Panel>
  );
}

export function BudgetCard({
  budget,
  spent,
  currency,
  title = "Monthly budget",
}: {
  budget: number | null;
  spent: number;
  currency: string;
  title?: string;
}) {
  return (
    <Panel title={title}>
      {budget === null ? (
        <EmptyState
          icon={<Receipt className="size-5" strokeWidth={1.5} />}
          title="No budget set for this month"
          description="Once a monthly budget exists, your remaining amount appears here."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl tabular-nums">{formatMoney(Math.max(budget - spent, 0), currency)}</p>
            <span className="text-xs text-muted-foreground">
              left of {formatMoney(budget, currency)}
            </span>
          </div>
          <ProgressBar value={spent} max={budget} tone={spent > budget ? "charcoal" : "gold"} className="mt-4" />
          <p className="mt-2 text-xs text-muted-foreground">
            {formatMoney(spent, currency)} spent this month
            {spent > budget ? " · over budget" : ` · ${percentOf(spent, budget)}% used`}
          </p>
        </>
      )}
    </Panel>
  );
}
