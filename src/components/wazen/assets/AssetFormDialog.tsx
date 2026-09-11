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
import { useSaveAsset } from "@/hooks/use-wazen-assets";
import type { AssetInput } from "@/hooks/use-wazen-assets";
import { ASSET_KINDS, unitOf } from "@/lib/assets";
import { GOLD_PURITIES, HOLDING_PURPOSES } from "@/lib/zakat";
import type { Asset, AssetKind } from "@/lib/assets";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

const inputClass = "wazen-field";

const KIND_LABEL_KEY = {
  stock: "kindStock",
  gold: "kindGold",
  silver: "kindSilver",
  real_estate: "kindRealEstate",
} as const;

const today = () => new Date().toISOString().slice(0, 10);

export function AssetFormDialog({
  open,
  onClose,
  asset,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  currency: string;
}) {
  const { t } = useWazenLocale();
  const save = useSaveAsset();
  const [kind, setKind] = useState<AssetKind>("stock");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purity, setPurity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("0");
  const [holdingPurpose, setHoldingPurpose] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind(asset?.kind ?? "stock");
    setName(asset?.name ?? "");
    setSymbol(asset?.symbol ?? "");
    setPurchaseDate(asset?.purchase_date ?? today());
    setQuantity(asset ? String(Number(asset.quantity)) : "1");
    setUnitCost(asset ? String(Number(asset.unit_cost)) : "");
    setCurrentValue(asset ? String(Number(asset.current_unit_value)) : "");
    setPurity(asset?.purity ?? "");
    setPropertyType(asset?.property_type ?? "");
    setMonthlyRent(asset ? String(Number(asset.monthly_rent)) : "0");
    setHoldingPurpose(asset?.holding_purpose ?? "");
    setNotes(asset?.notes ?? "");
  }, [open, asset]);

  const unit = unitOf(kind);
  const isProperty = unit === "property";
  const isMetal = unit === "grams";

  async function submit() {
    const qty = isProperty ? 1 : Number(quantity);
    const cost = Number(unitCost);
    const current = Number(currentValue);
    if (name.trim().length < 2) {
      toast.error(t("assetName"));
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error(isMetal ? t("quantityGrams") : t("quantityShares"));
      return;
    }
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(current) || current < 0) {
      toast.error(t("unitCostProperty"));
      return;
    }

    const input: AssetInput = {
      kind,
      name: name.trim(),
      symbol: symbol.trim() || null,
      currency,
      purchase_date: purchaseDate,
      quantity: qty,
      unit_cost: cost,
      current_unit_value: current,
      purity: isMetal ? purity.trim() || null : null,
      property_type: isProperty ? propertyType.trim() || null : null,
      monthly_rent: isProperty ? Math.max(Number(monthlyRent) || 0, 0) : 0,
      holding_purpose: holdingPurpose || null,
      notes: notes.trim() || null,
    };

    try {
      await save.mutateAsync({ id: asset?.id, input });
      toast.success(t("assetSaved"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("somethingWentWrong"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? t("editAsset") : t("addAsset")}</DialogTitle>
          <DialogDescription>{t("notSpendable")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label={t("assetKind")}>
            <select
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as AssetKind)}
            >
              {ASSET_KINDS.map((option) => (
                <option key={option} value={option}>
                  {t(KIND_LABEL_KEY[option])}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("assetName")}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          {kind === "stock" ? (
            <Field label={t("assetSymbol")}>
              <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </Field>
          ) : null}

          {isProperty ? (
            <Field label={t("propertyType")}>
              <input
                className={inputClass}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              />
            </Field>
          ) : (
            <Field label={isMetal ? t("quantityGrams") : t("quantityShares")}>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
          )}

          {isMetal ? (
            <Field label={t("purity")}>
              {kind === "gold" ? (
                <select className={inputClass} value={purity || "24K"} onChange={(e) => setPurity(e.target.value)}>
                  {GOLD_PURITIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={inputClass} value={purity} onChange={(e) => setPurity(e.target.value)} placeholder="999" />
              )}
            </Field>
          ) : null}

          <Field label={t("holdingPurpose")}>
            <select
              className={inputClass}
              value={holdingPurpose}
              onChange={(e) => setHoldingPurpose(e.target.value)}
            >
              <option value="">—</option>
              {HOLDING_PURPOSES.map((option) => (
                <option key={option} value={option}>
                  {t(`purpose_${option}` as "purpose_trade")}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("purchaseDate")}>
            <input
              className={inputClass}
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </Field>

          <Field
            label={`${
              isProperty ? t("unitCostProperty") : isMetal ? t("unitCostGram") : t("unitCostShare")
            } (${currency})`}
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.001"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </Field>

          <Field
            label={`${
              isProperty
                ? t("currentValueProperty")
                : isMetal
                  ? t("currentValueGram")
                  : t("currentValueShare")
            } (${currency})`}
          >
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.001"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
          </Field>

          {isProperty ? (
            <Field label={`${t("monthlyRent")} (${currency})`}>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.001"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </Field>
          ) : null}

          <Field label={t("notesField")}>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div className="mt-2 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="wazen-label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
