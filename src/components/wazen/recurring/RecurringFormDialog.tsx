import { useEffect, useState } from "react";
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
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useSaveRecurringItem } from "@/hooks/use-wazen-recurring";
import { CURRENCIES, DEFAULT_CURRENCY, currencyName } from "@/lib/currency";
import { firstOfMonth } from "@/lib/finance";
import type { RecurringFrequency, RecurringItem, RecurringKind } from "@/lib/finance";

const FREQUENCIES: RecurringFrequency[] = ["weekly", "monthly", "quarterly", "yearly"];
const KINDS: RecurringKind[] = ["expense", "income", "saving"];

export function RecurringFormDialog({
  open,
  onOpenChange,
  item,
  currency = DEFAULT_CURRENCY,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RecurringItem | null;
  currency?: string;
}) {
  const { t, language } = useWazenLocale();
  const save = useSaveRecurringItem();

  const [kind, setKind] = useState<RecurringKind>("expense");
  const [name, setName] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState(t("subscriptionsCategory"));
  const [amount, setAmount] = useState("");
  const [itemCurrency, setItemCurrency] = useState(currency);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [day, setDay] = useState("1");
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? "expense");
    setName(item?.name ?? "");
    setMerchant(item?.merchant ?? "");
    setCategory(item?.category ?? t("subscriptionsCategory"));
    setAmount(item ? String(item.amount) : "");
    setItemCurrency(item?.currency ?? currency);
    setFrequency(item?.frequency ?? "monthly");
    setDay(String(item?.day_of_month ?? 1));
    setStartDate(item?.start_date?.slice(0, 10) ?? firstOfMonth());
    setEndsOn(item?.ends_on?.slice(0, 10) ?? "");
    setNote(item?.note ?? "");
  }, [open, item, currency]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;
    try {
      await save.mutateAsync({
        id: item?.id,
        kind,
        name: name.trim(),
        merchant: merchant.trim() || null,
        category: category.trim() || t("subscriptionsCategory"),
        amount: value,
        currency: itemCurrency,
        frequency,
        day_of_month: Math.min(Math.max(Number(day) || 1, 1), 31),
        start_date: startDate || firstOfMonth(),
        ends_on: endsOn || null,
        note: note.trim() || null,
        active: item ? item.active : true,
      });
      toast.success(t("recurringSaved"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorTitle"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? t("editRecurring") : t("addRecurring")}</DialogTitle>
          <DialogDescription>{t("recurringSubtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="wazen-label">{t("typeLabel")}</span>
              <select className="wazen-field mt-2" value={kind} onChange={(e) => setKind(e.target.value as RecurringKind)}>
                {KINDS.map((option) => (
                  <option key={option} value={option}>
                    {option === "income" ? t("income") : option === "saving" ? t("savingKind") : t("expense")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="wazen-label">{t("recurringName")}</span>
              <input className="wazen-field mt-2" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="block">
              <span className="wazen-label">{t("provider")}</span>
              <input className="wazen-field mt-2" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </label>
            <label className="block">
              <span className="wazen-label">{t("categoryLabel")}</span>
              <input className="wazen-field mt-2" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="block">
              <span className="wazen-label">{t("amountLabel")}</span>
              <input
                className="wazen-field mt-2"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="wazen-label">{t("currencyLabel")}</span>
              <select className="wazen-field mt-2" value={itemCurrency} onChange={(e) => setItemCurrency(e.target.value)}>
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {currencyName(option.code, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="wazen-label">{t("frequencyLabel")}</span>
              <select
                className="wazen-field mt-2"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
              >
                {FREQUENCIES.map((option) => (
                  <option key={option} value={option}>
                    {t(option === "monthly" ? "monthlyFreq" : option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="wazen-label">{t("dayOfMonth")}</span>
              <input
                className="wazen-field mt-2"
                type="number"
                min="1"
                max="31"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="wazen-label">{t("startDate")}</span>
              <input className="wazen-field mt-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="wazen-label">{t("endDateOptional")}</span>
              <input className="wazen-field mt-2" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="wazen-label">{t("noteOptional")}</span>
            <input className="wazen-field mt-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancelLabel")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
              {t("saveLabel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
