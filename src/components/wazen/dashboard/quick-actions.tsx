import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Loader2, PiggyBank, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/finance";

type ActionKind = "income" | "expense" | "saving" | "goal";

const inputClass =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

const ACTION_META: Record<ActionKind, { label: string; title: string; description: string; icon: typeof ArrowDownLeft }> = {
  income: {
    label: "Add income",
    title: "Add income",
    description: "Money you received — salary, allowance, support or a side job.",
    icon: ArrowDownLeft,
  },
  expense: {
    label: "Add expense",
    title: "Add expense",
    description: "Something you spent money on.",
    icon: ArrowUpRight,
  },
  saving: {
    label: "Add saving",
    title: "Move money to savings",
    description: "Savings are set aside, so they are not counted as available money.",
    icon: PiggyBank,
  },
  goal: {
    label: "Add goal",
    title: "Create a savings goal",
    description: "Give it a name and a target amount to save towards.",
    icon: Target,
  },
};

export function QuickActions({
  userId,
  currency,
  goals,
  labels,
}: {
  userId: string;
  currency: string;
  goals: Goal[];
  labels?: Partial<Record<ActionKind, string>>;
}) {
  const [open, setOpen] = useState<ActionKind | null>(null);
  const order: ActionKind[] = ["income", "expense", "saving", "goal"];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {order.map((kind) => {
          const meta = ACTION_META[kind];
          const Icon = meta.icon;
          return (
            <button
              key={kind}
              onClick={() => setOpen(kind)}
              className="wazen-panel flex items-center gap-3 px-4 py-4 text-left text-sm transition-shadow hover:shadow-lifted"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Icon className="size-4" strokeWidth={1.6} />
              </span>
              <span className="leading-tight">{labels?.[kind] ?? meta.label}</span>
            </button>
          );
        })}
      </div>

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

function ActionDialog({
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
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goalId, setGoalId] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setAmount("");
    setCategory("");
    setMerchant("");
    setDate(new Date().toISOString().slice(0, 10));
    setGoalId("");
    setGoalName("");
    setGoalTarget("");
    setGoalDate("");
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
        if (goalName.trim().length < 2) throw new Error("Give your goal a name");
        if (!Number.isFinite(target) || target <= 0) throw new Error("Enter a target amount");
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
        toast.success("Goal created");
      } else {
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount greater than zero");
        if (kind !== "saving" && category.trim().length < 2) throw new Error("Enter a category");
        const { error } = await supabase.from("transactions").insert({
          user_id: userId,
          kind,
          category: kind === "saving" ? "Savings" : category.trim(),
          merchant: merchant.trim() || null,
          amount: value,
          currency,
          occurred_on: date,
          goal_id: kind === "saving" && goalId ? goalId : null,
        });
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["transactions"] });
        toast.success(kind === "saving" ? "Saving recorded" : "Transaction added");
      }
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const meta = kind ? ACTION_META[kind] : null;

  return (
    <Dialog open={kind !== null} onOpenChange={(next) => (!next ? close() : undefined)}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        {meta ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{meta.title}</DialogTitle>
              <DialogDescription>{meta.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {kind === "goal" ? (
                <>
                  <Field label="Goal name">
                    <input className={inputClass} value={goalName} onChange={(e) => setGoalName(e.target.value)} />
                  </Field>
                  <Field label={`Target amount (${currency})`}>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.001"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                    />
                  </Field>
                  <Field label="Target date (optional)">
                    <input
                      className={inputClass}
                      type="date"
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={`Amount (${currency})`}>
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
                    <Field label="Towards (optional)">
                      <select className={inputClass} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                        <option value="">General savings</option>
                        {goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <>
                      <Field label="Category">
                        <input
                          className={inputClass}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder={kind === "income" ? "Salary" : "Groceries"}
                        />
                      </Field>
                      <Field label={kind === "income" ? "Source (optional)" : "Merchant (optional)"}>
                        <input
                          className={inputClass}
                          value={merchant}
                          onChange={(e) => setMerchant(e.target.value)}
                        />
                      </Field>
                    </>
                  )}
                  <Field label="Date">
                    <input
                      className={inputClass}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                onClick={submit}
                disabled={busy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground",
                  "transition-opacity hover:opacity-90 disabled:opacity-60",
                )}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save
              </button>
              <button
                onClick={close}
                className="rounded-full border border-border px-7 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
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
