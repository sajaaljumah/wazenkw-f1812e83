import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@/components/wazen/icons";
import { useAddParentPaidExpense } from "@/hooks/use-wazen-finance";
import type { FamilyMemberSummary } from "@/hooks/use-wazen-finance";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { firstNameOf } from "@/lib/wazen";

const inputClass = "wazen-field";

const PAYMENT_METHODS = ["Debit card", "Credit card", "Bank transfer", "Cash", "Apple Pay"] as const;

/** Parents record spending they paid for a linked child or teenager. */
export function ParentPaidExpenseDialog({
  open,
  onClose,
  members,
  currency,
  defaultMemberId,
}: {
  open: boolean;
  onClose: () => void;
  members: FamilyMemberSummary[];
  currency: string;
  defaultMemberId?: string;
}) {
  const { t } = useWazenLocale();
  const save = useAddParentPaidExpense();
  const [childId, setChildId] = useState(defaultMemberId ?? members[0]?.profile.id ?? "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deduct, setDeduct] = useState(false);

  const selected = members.find((member) => member.profile.id === childId);
  const canDeduct = selected?.canFund === true;

  function close() {
    setAmount("");
    setCategory("");
    setMerchant("");
    setDeduct(false);
    setDate(new Date().toISOString().slice(0, 10));
    onClose();
  }

  async function submit() {
    const value = Number(amount);
    if (!childId) {
      toast.error(t("selectFamilyMember"));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("amountField"));
      return;
    }
    if (category.trim().length < 2) {
      toast.error(t("categoryField"));
      return;
    }
    try {
      await save.mutateAsync({
        childUserId: childId,
        amount: value,
        category: category.trim(),
        merchant: merchant.trim() || null,
        occurredOn: date,
        paymentMethod: method,
        currency,
        deductFromChild: canDeduct ? deduct : false,
      });
      toast.success(t("parentPaidSaved"));
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? close() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addExpenseForChild")}</DialogTitle>
          <DialogDescription>{t("parentPaidIntro")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label={t("forFamilyMember")}>
            <select className={inputClass} value={childId} onChange={(e) => setChildId(e.target.value)}>
              <option value="">{t("selectFamilyMember")}</option>
              {members.map((member) => (
                <option key={member.profile.id} value={member.profile.id}>
                  {firstNameOf(member.profile.full_name)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${t("amountField")} (${currency})`}>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field label={t("categoryField")}>
            <input
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Education"
            />
          </Field>

          <Field label={t("merchantField")}>
            <input className={inputClass} value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </Field>

          <Field label={t("paymentMethod")}>
            <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("dateField")}>
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          {canDeduct ? (
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={deduct}
                onChange={(e) => setDeduct(e.target.checked)}
              />
              <span>
                {t("deductFromChild")}
                <span className="mt-1 block text-xs text-muted-foreground">{t("deductHint")}</span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">{t("deductHint")}</p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
            {t("save")}
          </Button>
          <Button onClick={close} variant="outline">
            {t("cancel")}
          </Button>
        </div>
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
