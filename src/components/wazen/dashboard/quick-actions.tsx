import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BudgetIcon,
  ExpensesIcon,
  GiveIcon,
  GoalsIcon,
  IncomeIcon,
  SavingsIcon,
  SpinnerIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Goal } from "@/lib/finance";
import { firstOfMonth } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

/**
 * Wazen's money actions. Every action writes a real row through the existing
 * tables (transactions, goals, budgets) — none of them is informational.
 * "Giving" is stored as an expense whose category records the type of giving,
 * so it flows through the existing spending calculations and analytics.
 */
export type ActionKind = "expense" | "saving" | "give" | "income" | "budget" | "goal";

const inputClass = "wazen-field";

type Meta = {
  label: string;
  title: string;
  description: string;
  icon: typeof IncomeIcon;
  /** Emphasised actions sit first and read as the primary way to record money. */
  primary?: boolean;
};

function metaFor(t: (key: never) => string): Record<ActionKind, Meta> {
  const tr = t as unknown as (key: string) => string;
  return {
    expense: {
      label: tr("iSpent"),
      title: tr("iSpentTitle"),
      description: tr("iSpentDescription"),
      icon: ExpensesIcon,
      primary: true,
    },
    saving: {
      label: tr("iSaved"),
      title: tr("iSavedTitle"),
      description: tr("iSavedDescription"),
      icon: SavingsIcon,
      primary: true,
    },
    give: {
      label: tr("iGave"),
      title: tr("iGaveTitle"),
      description: tr("iGaveDescription"),
      icon: GiveIcon,
      primary: true,
    },
    income: {
      label: tr("receivedMoney"),
      title: tr("incomeTitle"),
      description: tr("incomeDescription"),
      icon: IncomeIcon,
    },
    budget: {
      label: tr("newBudget"),
      title: tr("budgetTitle"),
      description: tr("budgetDescriptionDialog"),
      icon: BudgetIcon,
    },
    goal: {
      label: tr("newGoal"),
      title: tr("goalTitle"),
      description: tr("goalDescriptionDialog"),
      icon: GoalsIcon,
    },
  };
}

// Zakat is deliberately absent: it is recorded on the Zakat page as its own
// payment type so sadaqah is never classified as zakat.
const GIVING_TYPES = ["givingSadaqah", "givingGift", "givingSupport"] as const;
const PAYMENT_METHODS = ["payCard", "payCash", "payTransfer"] as const;

export function QuickActions({
  userId,
  currency,
  goals,
  actions,
}: {
  userId: string;
  currency: string;
  goals: Goal[];
  /** Lets simplified life stages show a shorter set of actions. */
  actions?: ActionKind[];
}) {
  const { t } = useWazenLocale();
  const [open, setOpen] = useState<ActionKind | null>(null);
  const meta = metaFor(t as never);
  const order: ActionKind[] = actions ?? ["expense", "saving", "give", "income", "budget", "goal"];

  return (
    <>
      <section className="wazen-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="wazen-label">{t("moneyActions" as never)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {order.map((kind) => {
            const item = meta[kind];
            const Icon = item.icon;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setOpen(kind)}
                className={
                  item.primary
                    ? "group flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-3 text-start transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-hidden"
                    : "group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-start transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-hidden"
                }
              >
                <span
                  className={
                    item.primary
                      ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary transition-transform group-active:scale-95"
                      : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-transform group-active:scale-95"
                  }
                >
                  <Icon className="size-4" strokeWidth={ICON_STROKE} />
                </span>
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <ActionDialog
        kind={open}
        onClose={() => setOpen(null)}
        userId={userId}
        currency={currency}
        goals={goals}
      />
    </>
  );
}

export function ActionDialog({
  kind,
  onClose,
  userId,
  currency,
  goals,
}: {
  kind: ActionKind | null;
  onClose: () => void;
  userId: string;
  currency: string;
  goals: Goal[];
}) {
  const { t } = useWazenLocale();
  const tr = t as unknown as (key: string) => string;
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [givingType, setGivingType] = useState<string>(GIVING_TYPES[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goalId, setGoalId] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(() => firstOfMonth().slice(0, 7));
  const [busy, setBusy] = useState(false);

  function reset() {
    setAmount("");
    setCategory("");
    setMerchant("");
    setNote("");
    setGivingType(GIVING_TYPES[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setDate(new Date().toISOString().slice(0, 10));
    setGoalId("");
    setGoalName("");
    setGoalTarget("");
    setGoalDate("");
    setBudgetMonth(firstOfMonth().slice(0, 7));
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    if (!kind) return;
    setBusy(true);
    try {
      if (kind === "goal") {
        const target = Number(goalTarget);
        if (goalName.trim().length < 2) throw new Error(tr("enterGoalName"));
        if (!Number.isFinite(target) || target <= 0) throw new Error(tr("enterAmount"));
        const { error } = await supabase.from("goals").insert({
          user_id: userId,
          name: goalName.trim(),
          kind: "goal",
          target_amount: target,
          target_date: goalDate || null,
          currency,
        });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["goals"] });
      } else if (kind === "budget") {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) throw new Error(tr("enterAmount"));
        const { error } = await supabase
          .from("budgets")
          .upsert(
            {
              user_id: userId,
              period_month: `${budgetMonth}-01`,
              amount: value,
              currency,
            },
            { onConflict: "user_id,period_month" },
          );
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["budget"] });
      } else {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) throw new Error(tr("enterAmount"));
        if ((kind === "expense" || kind === "income") && category.trim().length < 2) {
          throw new Error(tr("enterCategory"));
        }
        const resolvedCategory =
          kind === "saving" ? "Savings" : kind === "give" ? tr(givingType) : category.trim();
        const { error } = await supabase.from("transactions").insert({
          user_id: userId,
          // Giving is real spending, so it flows through expense analytics.
          kind: kind === "give" ? "expense" : kind,
          category: resolvedCategory,
          merchant: merchant.trim() || null,
          note: note.trim() || null,
          amount: value,
          currency,
          occurred_on: date,
          payment_method: kind === "saving" ? null : tr(paymentMethod),
          goal_id: kind === "saving" && goalId ? goalId : null,
        });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      }
      toast.success(tr("savedToast"));
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const meta = kind ? metaFor(t as never)[kind] : null;

  return (
    <Dialog open={kind !== null} onOpenChange={(next) => (!next ? close() : undefined)}>
      <DialogContent className="sm:max-w-md">
        {meta && kind ? (
          <>
            <DialogHeader>
              <DialogTitle>{meta.title}</DialogTitle>
              <DialogDescription>{meta.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {kind === "goal" ? (
                <>
                  <Field label={tr("goalNameField")}>
                    <input className={inputClass} value={goalName} onChange={(e) => setGoalName(e.target.value)} />
                  </Field>
                  <Field label={`${tr("targetAmountField")} (${currency})`}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.001"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                    />
                  </Field>
                  <Field label={tr("targetDateField")}>
                    <input
                      className={inputClass}
                      type="date"
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                    />
                  </Field>
                </>
              ) : kind === "budget" ? (
                <>
                  <Field label={tr("budgetMonthField")}>
                    <input
                      className={inputClass}
                      type="month"
                      value={budgetMonth}
                      onChange={(e) => setBudgetMonth(e.target.value)}
                    />
                  </Field>
                  <Field label={`${tr("amountField")} (${currency})`}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={`${tr("amountField")} (${currency})`}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.001"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Field>

                  {kind === "saving" ? (
                    <Field label={tr("towardsGoal")}>
                      <select className={inputClass} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                        <option value="">{tr("generalSavings")}</option>
                        {goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : kind === "give" ? (
                    <>
                      <Field label={tr("givingTypeField")}>
                        <select
                          className={inputClass}
                          value={givingType}
                          onChange={(e) => setGivingType(e.target.value)}
                        >
                          {GIVING_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {tr(type)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={tr("recipientField")}>
                        <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label={tr("categoryField")}>
                        <input
                          className={inputClass}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        />
                      </Field>
                      <Field label={kind === "income" ? tr("sourceField") : tr("merchantField")}>
                        <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
                      </Field>
                    </>
                  )}

                  {kind === "saving" ? null : (
                    <Field label={tr("paymentMethodField")}>
                      <select
                        className={inputClass}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {tr(method)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label={tr("dateField")}>
                    <input
                      className={inputClass}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>

                  <Field label={tr("notesField")}>
                    <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <Button onClick={submit} disabled={busy}>
                {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                {tr("save")}
              </Button>
              <Button onClick={close} variant="outline">
                {tr("cancel")}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="wazen-label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
