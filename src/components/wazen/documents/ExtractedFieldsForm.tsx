import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { CURRENCIES, currencyName } from "@/lib/currency";
import { FIELDS_BY_KIND } from "@/lib/documents";
import type { DocumentKind, ExtractedFields } from "@/lib/documents";

const LABEL_KEY: Record<string, string> = {
  vendor: "fieldVendor",
  documentDate: "fieldDocumentDate",
  category: "fieldCategory",
  currency: "fieldCurrency",
  totalAmount: "fieldTotalAmount",
  taxAmount: "fieldTaxAmount",
  paymentMethod: "fieldPaymentMethod",
  reference: "fieldReference",
  note: "fieldNote",
  metalGrams: "fieldMetalGrams",
  metalPurity: "fieldMetalPurity",
  pricePerGram: "fieldPricePerGram",
  symbol: "fieldSymbol",
  quantity: "fieldQuantity",
  unitPrice: "fieldUnitPrice",
  propertyAddress: "fieldPropertyAddress",
  propertyValue: "fieldPropertyValue",
  monthlyRent: "fieldMonthlyRent",
  contractStart: "fieldContractStart",
  contractEnd: "fieldContractEnd",
};

const NUMBER_FIELDS = new Set([
  "totalAmount",
  "taxAmount",
  "metalGrams",
  "pricePerGram",
  "quantity",
  "unitPrice",
  "propertyValue",
  "monthlyRent",
]);

const DATE_FIELDS = new Set(["documentDate", "contractStart", "contractEnd"]);

/**
 * Editable view of the canonical extracted-field shape. A future extraction API
 * fills exactly these fields, so no redesign is needed when it is connected.
 */
export function ExtractedFieldsForm({
  kind,
  fields,
  onChange,
}: {
  kind: DocumentKind;
  fields: ExtractedFields;
  onChange: (fields: ExtractedFields) => void;
}) {
  const { t, language } = useWazenLocale();
  const keys = FIELDS_BY_KIND[kind];

  const set = (key: keyof ExtractedFields, value: unknown) => {
    onChange({ ...fields, [key]: value } as ExtractedFields);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {keys.map((key) => {
        const name = String(key);
        const label = t((LABEL_KEY[name] ?? name) as never);
        if (name === "currency") {
          return (
            <label key={name} className="block">
              <span className="wazen-label">{label}</span>
              <select
                className="wazen-field mt-2"
                value={fields.currency}
                onChange={(event) => set("currency", event.target.value)}
              >
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {currencyName(option.code, language)}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        const value = fields[key];
        return (
          <label key={name} className="block">
            <span className="wazen-label">{label}</span>
            <input
              className="wazen-field mt-2"
              type={NUMBER_FIELDS.has(name) ? "number" : DATE_FIELDS.has(name) ? "date" : "text"}
              step={NUMBER_FIELDS.has(name) ? "0.001" : undefined}
              value={value === null || value === undefined ? "" : String(value)}
              onChange={(event) => {
                const raw = event.target.value;
                if (NUMBER_FIELDS.has(name)) {
                  set(key, raw === "" ? null : Number(raw));
                } else {
                  set(key, raw === "" ? null : raw);
                }
              }}
            />
          </label>
        );
      })}
    </div>
  );
}
