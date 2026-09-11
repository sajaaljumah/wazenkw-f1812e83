/**
 * Financial document uploads.
 *
 * Wazen lets people upload or photograph a receipt, invoice or contract. The
 * screens, states and stored shape are complete, but no AI service is connected:
 * `DocumentExtractionProvider` is the single seam where a real extraction API
 * will be plugged in later. Until then extraction reports itself as unavailable
 * and the person fills or corrects the fields themselves.
 */

import { DEFAULT_CURRENCY } from "@/lib/currency";

export type DocumentKind =
  | "receipt"
  | "gold_invoice"
  | "silver_invoice"
  | "stock_purchase"
  | "property_contract"
  | "rental_contract"
  | "other";

export const DOCUMENT_KINDS: DocumentKind[] = [
  "receipt",
  "gold_invoice",
  "silver_invoice",
  "stock_purchase",
  "property_contract",
  "rental_contract",
  "other",
];

/** Wazen's own review status for an uploaded document. */
export type DocumentStatus = "uploaded" | "awaiting_extraction" | "review" | "saved" | "failed";

/**
 * The structured result an extraction API is expected to return. Every screen
 * reads and writes exactly these fields, so a future API response can populate
 * them without any redesign.
 */
export type ExtractedFields = {
  documentDate: string | null;
  vendor: string | null;
  category: string | null;
  currency: string;
  totalAmount: number | null;
  taxAmount: number | null;
  paymentMethod: string | null;
  reference: string | null;
  note: string | null;
  /** Metals */
  metalGrams: number | null;
  metalPurity: string | null;
  pricePerGram: number | null;
  /** Stocks and funds */
  symbol: string | null;
  quantity: number | null;
  unitPrice: number | null;
  /** Property and rentals */
  propertyAddress: string | null;
  propertyValue: number | null;
  monthlyRent: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  /** Line items, when the document contains them. */
  lineItems: { description: string; amount: number | null }[];
};

export function emptyExtraction(currency: string = DEFAULT_CURRENCY): ExtractedFields {
  return {
    documentDate: null,
    vendor: null,
    category: null,
    currency,
    totalAmount: null,
    taxAmount: null,
    paymentMethod: null,
    reference: null,
    note: null,
    metalGrams: null,
    metalPurity: null,
    pricePerGram: null,
    symbol: null,
    quantity: null,
    unitPrice: null,
    propertyAddress: null,
    propertyValue: null,
    monthlyRent: null,
    contractStart: null,
    contractEnd: null,
    lineItems: [],
  };
}

/** Merges a partial (future API) result onto the canonical shape. */
export function mergeExtraction(
  base: ExtractedFields,
  patch: Partial<ExtractedFields> | null | undefined,
): ExtractedFields {
  return { ...base, ...(patch ?? {}) };
}

/** Which extracted fields each document type asks for, in display order. */
export const FIELDS_BY_KIND: Record<DocumentKind, (keyof ExtractedFields)[]> = {
  receipt: ["vendor", "documentDate", "totalAmount", "currency", "category", "taxAmount", "paymentMethod", "reference", "note"],
  gold_invoice: ["vendor", "documentDate", "metalGrams", "metalPurity", "pricePerGram", "totalAmount", "currency", "reference", "note"],
  silver_invoice: ["vendor", "documentDate", "metalGrams", "metalPurity", "pricePerGram", "totalAmount", "currency", "reference", "note"],
  stock_purchase: ["vendor", "documentDate", "symbol", "quantity", "unitPrice", "totalAmount", "currency", "reference", "note"],
  property_contract: ["propertyAddress", "documentDate", "propertyValue", "currency", "contractStart", "contractEnd", "reference", "note"],
  rental_contract: ["propertyAddress", "documentDate", "monthlyRent", "currency", "contractStart", "contractEnd", "reference", "note"],
  other: ["vendor", "documentDate", "totalAmount", "currency", "category", "note"],
};

export type ExtractionOutcome =
  | { status: "unavailable"; reason: string }
  | { status: "extracted"; fields: Partial<ExtractedFields>; confidence: number | null }
  | { status: "failed"; reason: string };

export type ExtractionRequest = {
  documentId: string;
  kind: DocumentKind;
  filePath: string | null;
  mimeType: string | null;
};

export type DocumentExtractionProvider = {
  readonly name: string;
  /** True once a real extraction service is wired up. */
  readonly connected: boolean;
  extract(request: ExtractionRequest): Promise<ExtractionOutcome>;
};

/** Shipping default: no AI service is connected, and Wazen says so plainly. */
export const unavailableExtractionProvider: DocumentExtractionProvider = {
  name: "none",
  connected: false,
  async extract() {
    return { status: "unavailable", reason: "no-extraction-provider" };
  },
};

let activeProvider: DocumentExtractionProvider = unavailableExtractionProvider;

/** Called once, later, by the backend/API layer. */
export function setExtractionProvider(provider: DocumentExtractionProvider): void {
  activeProvider = provider;
}

export function extractionProvider(): DocumentExtractionProvider {
  return activeProvider;
}

/**
 * Sample values used only to preview the review screen while no extraction
 * service exists. They are never presented as a real reading of a document.
 */
export function sampleExtraction(kind: DocumentKind, currency: string): ExtractedFields {
  const base = emptyExtraction(currency);
  const today = new Date().toISOString().slice(0, 10);
  switch (kind) {
    case "gold_invoice":
      return { ...base, vendor: "Sample jeweller", documentDate: today, metalGrams: 25, metalPurity: "21K", pricePerGram: 18.5, totalAmount: 462.5 };
    case "silver_invoice":
      return { ...base, vendor: "Sample jeweller", documentDate: today, metalGrams: 500, metalPurity: "999", pricePerGram: 0.28, totalAmount: 140 };
    case "stock_purchase":
      return { ...base, vendor: "Sample broker", documentDate: today, symbol: "NBK", quantity: 500, unitPrice: 0.95, totalAmount: 475 };
    case "property_contract":
      return { ...base, propertyAddress: "Sample address", documentDate: today, propertyValue: 250000, contractStart: today };
    case "rental_contract":
      return { ...base, propertyAddress: "Sample address", documentDate: today, monthlyRent: 850, contractStart: today };
    case "other":
      return { ...base, vendor: "Sample document", documentDate: today, totalAmount: 100 };
    default:
      return { ...base, vendor: "Sample store", documentDate: today, totalAmount: 32.75, category: "Groceries", paymentMethod: "Card" };
  }
}

export type FinancialDocument = {
  id: string;
  user_id: string;
  doc_type: DocumentKind;
  title: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  extraction_source: string;
  extracted: Partial<ExtractedFields> | null;
  error_message: string | null;
  saved_transaction_id: string | null;
  created_at: string;
};

/** Document types that should create a spending record when saved. */
export function savesAsTransaction(kind: DocumentKind): boolean {
  return kind === "receipt" || kind === "other";
}
