import { FamilyIcon, GiveIcon, PremiumIcon, StudentIcon, ICON_STROKE } from "@/components/wazen/icons";
import { BalanceHero, EmptyState, Panel, ProgressBar, percentOf } from "./primitives";

import { BudgetCard, EmergencyFundCard, GoalsCard, RecentTransactionsCard, UpcomingCashFlowCard } from "./lists";
import { IncomeVsExpensesCard, SavingsTrendCard, SpendingByCategoryCard } from "./charts";

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
import { PortfolioSummaryCard } from "@/components/wazen/assets/PortfolioSummaryCard";
import { ParentPaidCard } from "@/components/wazen/family/ParentPaidCard";
import { ParentPaidExpenseDialog } from "@/components/wazen/family/ParentPaidExpenseDialog";
import { useAssets } from "@/hooks/use-wazen-assets";
import { useParentPaidForMe } from "@/hooks/use-wazen-finance";
import { AddIcon, ReceiptIcon } from "@/components/wazen/icons";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/finance";
import { useState } from "react";

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
  const assets = useAssets();

  return (
    <>
      <QuickActions userId={userId} currency={currency} goals={goals} />

      <BalanceHero
        label={t("availableMoney")}
        amount={all.net}
        currency={currency}
        hint={t("afterExpensesHint")}
        items={[
          { label: t("incomeMonth"), amount: month.income, tone: "positive" },
          { label: t("expensesMonth"), amount: month.expenses, tone: "negative" },
          { label: t("totalSavings"), amount: savedTotal, tone: "gold" },
        ]}
      />


      <div className="grid gap-5 lg:grid-cols-2">
        <BudgetCard budget={budget ? Number(budget.amount) : null} spent={month.expenses} currency={currency} />
        <EmergencyFundCard goals={goals} transactions={transactions} currency={currency} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SpendingByCategoryCard transactions={monthTransactions} currency={currency} />
        <IncomeVsExpensesCard transactions={transactions} currency={currency} />
      </div>

      <SavingsTrendCard transactions={transactions} currency={currency} />


      <div className="grid gap-5 lg:grid-cols-2">
        <GoalsCard goals={goals} transactions={transactions} currency={currency} />
        <UpcomingCashFlowCard items={recurring} currency={currency} />
      </div>

      <PortfolioSummaryCard assets={assets.data ?? []} currency={currency} />

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
  const parentPaid = useParentPaidForMe();

  return (
    <>
      <QuickActions
        userId={userId}
        currency={currency}
        goals={goals}
        actions={["expense", "saving", "give", "income", "goal"]}
      />


      <BalanceHero
        label={t("moneyAvailable")}
        amount={all.net}
        currency={currency}
        items={[
          { label: t("allowanceMonth"), amount: allowance, tone: "positive" },
          { label: t("spentMonth"), amount: month.expenses, tone: "negative" },
          { label: t("savedSoFar"), amount: all.savings, tone: "gold" },
        ]}
      />


      <SavingsTrendCard transactions={transactions} currency={currency} title={t("savedSoFar")} />


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

      <ParentPaidCard transactions={parentPaid.data ?? []} />

      <Panel title={t("financialLearning")}>
        <EmptyState
          icon={<StudentIcon className="size-5" strokeWidth={ICON_STROKE} />}
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
  currency,
  transactions = [],
}: {
  members: FamilyMemberSummary[];
  isLoading: boolean;
  currency: string;
  /** The parent's own transactions — used to list parent-paid expenses. */
  transactions?: Transaction[];
}) {
  const { t } = useWazenLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const parentPaid = transactions
    .filter((item) => item.paid_by_parent && item.beneficiary_user_id && item.beneficiary_user_id !== item.user_id)
    .slice(0, 8);
  const nameOf = (id: string | null | undefined) => {
    const member = members.find((entry) => entry.profile.id === id);
    return member ? firstNameOf(member.profile.full_name) : "—";
  };

  return (
    <>
    <Panel
      title={t("familySummary")}
      action={
        members.length > 0 ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
            {t("addExpenseForChild")}
          </Button>
        ) : null
      }
    >
      {isLoading ? (

        <p className="text-sm text-muted-foreground">{t("loadingFamily")}</p>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<FamilyIcon className="size-5" strokeWidth={ICON_STROKE} />}
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

      {members.length > 0 ? (
        <div className="mt-8 border-t border-border/70 pt-6">
          <h3 className="text-lg">{t("parentPaidTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("parentPaidIntro")}</p>
          {parentPaid.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<ReceiptIcon className="size-5" strokeWidth={ICON_STROKE} />}
                title={t("noParentPaidRecorded")}
                description={t("noParentPaidRecordedDescription")}
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/70">
              {parentPaid.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {item.merchant ?? item.category}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {`${t("forFamilyMember")} ${nameOf(item.beneficiary_user_id)}`}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.category} · {formatDate(item.occurred_on)}
                      {item.payment_method ? ` · ${item.payment_method}` : ""}
                      {item.deducted_from_child ? ` · ${t("deductFromChild")}` : ""}
                    </p>
                  </div>
                  <p className="wazen-number shrink-0 text-sm">
                    {formatMoney(Number(item.amount), item.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Panel>

    <ParentPaidExpenseDialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      members={members}
      currency={currency}
    />
    </>
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
