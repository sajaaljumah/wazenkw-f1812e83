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
import { useRecordZakatPayment } from "@/hooks/use-wazen-zakat";

const inputClass = "wazen-field";
const today = () => new Date().toISOString().slice(0, 10);

/** Zakat payments are their own record type — never a sadaqah/giving entry. */
export function ZakatPaymentDialog({
  open,
  onClose,
  currency,
  suggestedAmount,
  calculationId,
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  suggestedAmount: number;
  calculationId?: string | null;
}) {
  const { t } = useWazenLocale();
  const record = useRecordZakatPayment();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount(suggestedAmount > 0 ? String(suggestedAmount) : "");
    setDate(today());
    setRecipient("");
    setNotes("");
  }, [open, suggestedAmount]);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t("enterAmount"));
      return;
    }
    try {
      await record.mutateAsync({
        amount: value,
        currency,
        paymentDate: date,
        recipient: recipient.trim() || null,
        notes: notes.trim() || null,
        status: "paid",
        calculationId: calculationId ?? null,
      });
      toast.success(t("zakatPaymentSaved"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("zakatRecordPayment")}</DialogTitle>
          <DialogDescription>{t("zakatSeparateSadaqah")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="wazen-label">{`${t("zakatPaymentAmount")} (${currency})`}</span>
            <input
              className={`${inputClass} mt-2`}
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="wazen-label">{t("zakatPaymentDate")}</span>
            <input
              className={`${inputClass} mt-2`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="wazen-label">{t("zakatPaymentRecipient")}</span>
            <input
              className={`${inputClass} mt-2`}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="wazen-label">{t("zakatPaymentNotes")}</span>
            <input
              className={`${inputClass} mt-2`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={record.isPending}>
            {record.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
            {t("save")}
          </Button>
          <Button onClick={onClose} variant="outline">
            {t("cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
