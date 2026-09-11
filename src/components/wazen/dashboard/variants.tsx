import { Coins, GraduationCap, HandHeart, PiggyBank, Sparkles, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { EmptyState, Panel, ProgressBar, StatCard, percentOf } from "./primitives";
import { BudgetCard, EmergencyFundCard, GoalsCard, RecentTransactionsCard, UpcomingCashFlowCard } from "./lists";
import { IncomeVsExpensesCard, SpendingByCategoryCard } from "./charts";
import { QuickActions } from "./quick-actions";
import {
  formatMoney,
  inMonth,
  monthKey,
  savedForGoal,
  totalsFor,
} from "@/lib/finance";
import type { Budget, Goal, RecurringItem, Transaction } from "@/lib/finance";
import type { FamilyMemberSummary } from "@/hooks/use-wazen-finance";
import { LIFE_STAGE_LABELS, calculateAge, firstNameOf } from "@/lib/wazen";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

export type DashboardData = {
  userId: string;
  currency: string;
  transactions: Transaction[];
  goals: Goal[];
  budget: Budget | null;
  recurring: RecurringItem[];
};

function useMonthTotals(transactions: Transaction[]) {
  const key = monthKey(new Date());
  const monthTransactions = inMonth(transactions, key);
  return { monthTransactions, month: totalsFor(monthTransactions), all: totalsFor(transactions) };
}

/** Employee, self-employed, university student and parent personal overview. */
export function AdultDashboard({
  data,
  focus,
}: {
  data: DashboardData;
  focus: "employee" | "student";
}) {
  const { currency, transactions, goals, budget, recurring, userId } = data;
  const { monthTransactions, month, all } = useMonthTotals(transactions);
  const savedTotal = all.savings;
  const { t } = useWazenLocale();

  return (
    <>
      <QuickActions userId={userId} currency={currency} goals={goals} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t("availableMoney")}
          amount={all.net}
          currency={currency}
          tone={all.net >= 0 ? "neutral" : "negative"}
          hint={t("afterExpensesHint")}
          className="col-span-2 lg:col-span-1"
          icon={<Wallet className="size-4" strokeWidth={1.5} />}
        />
        <StatCard
          label={t("incomeMonth")}
          amount={month.income}
          currency={currency}
          tone="positive"
          icon={<TrendingUp className="size-4" strokeWidth={1.5} />}
        />
        <StatCard
          label={t("expensesMonth")}
          amount={month.expenses}
          currency={currency}
          hint={t("refundsHint")}
          icon={<TrendingDown className="size-4" strokeWidth={1.5} />}
        />
        <StatCard
          label={t("totalSavings")}
          amount={savedTotal}
          currency={currency}
          tone="gold"
          hint={t("goalsHint")}
          icon={<PiggyBank className="size-4" strokeWidth={1.5} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BudgetCard budget={budget ? Number(budget.amount) : null} spent={month.expenses} currency={currency} />
        <EmergencyFundCard goals={goals} transactions={transactions} currency={currency} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SpendingByCategoryCard transactions={monthTransactions} currency={currency} />
        <IncomeVsExpensesCard transactions={transactions} currency={currency} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <GoalsCard goals={goals} transactions={transactions} currency={currency} />
        <UpcomingCashFlowCard items={recurring} currency={currency} />
      </div>

      <RecentTransactionsCard transactions={transactions} currency={currency} limit={8} />

      {focus === "student" ? (
        <Panel title={t("studyTip")}>
          <p className="text-sm text-muted-foreground">
            Support from family and part-time income both count towards your own budget — your
            account stays entirely private to you.
          </p>
        </Panel>
      ) : null}
    </>
  );
}

/** Teenager: youthful, allowance-first, with budget awareness. */
export function TeenagerDashboard({ data }: { data: DashboardData }) {
  const { currency, transactions, goals, budget, recurring, userId } = data;
  const { monthTransactions, month, all } = useMonthTotals(transactions);
  const allowance = monthTransactions
    .filter((t) => t.kind === "income" && /allowance/i.test(t.category))
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const { t } = useWazenLocale();

  return (
    <>
      <QuickActions
        userId={userId}
        currency={currency}
        goals={goals}
        labels={{ income: t("addMoneyIn"), expense: t("addSpending") }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("moneyAvailable")} amount={all.net} currency={currency} icon={<Wallet className="size-4" strokeWidth={1.5} />} />
        <StatCard label={t("allowanceMonth")} amount={allowance} currency={currency} tone="positive" icon={<Coins className="size-4" strokeWidth={1.5} />} />
        <StatCard label={t("spentMonth")} amount={month.expenses} currency={currency} icon={<TrendingDown className="size-4" strokeWidth={1.5} />} />
        <StatCard label={t("savedSoFar")} amount={all.savings} currency={currency} tone="gold" icon={<PiggyBank className="size-4" strokeWidth={1.5} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BudgetCard
          budget={budget ? Number(budget.amount) : null}
          spent={month.expenses}
          currency={currency}
          title={t("spendingLimit")}
        />
        <GoalsCard goals={goals} transactions={transactions} currency={currency} title={t("savingFor")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SpendingByCategoryCard transactions={monthTransactions} currency={currency} title={t("whereMoneyWent")} />
        <UpcomingCashFlowCard items={recurring} currency={currency} title={t("comingUp")} />
      </div>

      <RecentTransactionsCard transactions={transactions} currency={currency} title={t("latestActivity")} />

      <Panel title={t("financialLearning")}>
        <EmptyState
          icon={<GraduationCap className="size-5" strokeWidth={1.5} />}
          title={t("lessonsSoon")}
          description={t("lessonsSoonBody")}
        />
      </Panel>
    </>
  );
}

/** Child: the playful-luxury experience lives in its own module. */
export { ChildDashboard } from "./child/ChildDashboard";

/** Parent: personal overview plus a summary of permitted family members only. */
export function FamilySummaryCard({
  members,
  isLoading,
}: {
  members: FamilyMemberSummary[];
  isLoading: boolean;
}) {
  const { t } = useWazenLocale();
  return (
    <Panel title={t("familySummary")}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loadingFamily")}</p>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" strokeWidth={1.5} />}
          title={t("noFamily")}
          description={t("noFamilyDescription")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {members.map(({ profile, canFund, canMonitor, transactions, goals }) => {
            const totals = totalsFor(transactions);
            const goal = goals.find((g) => g.kind === "goal");
            const saved = goal ? savedForGoal(transactions, goal.id) : 0;
            return (
              <li
                key={profile.id}
                className="wazen-interactive border border-border bg-secondary/35 p-5 hover:bg-secondary/70 hover:wazen-interactive-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <WazenAvatar
                      fullName={profile.full_name}
                      gender={profile.gender}
                      lifeStage={profile.life_stage}
                      avatarUrl={profile.avatar_url}
                      size={44}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base">{firstNameOf(profile.full_name)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {LIFE_STAGE_LABELS[profile.life_stage]} · {calculateAge(profile.date_of_birth)} years
                      </p>
                    </div>
                  </div>
                   <span className="border border-border bg-background px-2.5 py-1 text-[0.7rem] text-muted-foreground">
                    {canFund ? t("allowanceTag") : canMonitor ? t("monitoringTag") : t("linkedTag")}
                  </span>
                </div>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <Row label={t("available")} value={formatMoney(totals.net, profile.base_currency)} />
                  <Row label={t("saved")} value={formatMoney(totals.savings, profile.base_currency)} />
                  <Row label={t("spent")} value={formatMoney(totals.expenses, profile.base_currency)} />
                </dl>
                {goal ? (
                  <>
                    <ProgressBar value={saved} max={Number(goal.target_amount)} tone="sage" className="mt-4" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {goal.name} · {percentOf(saved, Number(goal.target_amount))}%
                    </p>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
