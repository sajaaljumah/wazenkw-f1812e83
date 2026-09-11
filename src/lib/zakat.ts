/**
 * Wazen Zakat engine.
 *
 * Methodology reference: Kuwait Zakat House (بيت الزكاة الكويتي)
 * https://www.zakathouse.org.kw/calculate.aspx
 *
 * Design rules:
 * - No price and no nisab amount is hardcoded. Gram prices come from stored,
 *   updatable `metal_rates` rows (later fed by a backend integration).
 * - The nisab thresholds themselves are methodology constants (85g pure 24K
 *   gold, ~595g pure silver), not market values.
 * - Every asset type has its own eligibility rule; 2.5% is never applied
 *   blindly to everything the user owns.
 * - Wazen presents a calculation, never a religious ruling.
 */

import { availableMoney, round } from "@/lib/finance";
import type { Transaction } from "@/lib/finance";
import { marketValue } from "@/lib/assets";
import type { Asset } from "@/lib/assets";

export const ZAKAT_REFERENCE_URL = "https://www.zakathouse.org.kw/calculate.aspx";
export const ZAKAT_METHODOLOGY_REFERENCE =
  "Kuwait Zakat House — https://www.zakathouse.org.kw/calculate.aspx";

/** ربع العشر — a quarter of one tenth. */
export const ZAKAT_RATE = 0.025;

/** Methodology thresholds, expressed in weight (never in currency). */
export const GOLD_NISAB_GRAMS = 85;
export const SILVER_NISAB_GRAMS = 595;

export type MetalKind = "gold_24k" | "silver";

export type MetalRate = {
  id: string;
  metal: MetalKind;
  price_per_gram: number;
  currency: string;
  as_of: string;
  source: string;
};

export type NisabMethod = "gold" | "silver";
export type HawlStatus = "not_started" | "in_progress" | "completed";
export type ZakatStatus = "below_nisab" | "hawl_in_progress" | "due" | "recorded";

export type ZakatProfile = {
  user_id: string;
  zakat_start_date: string | null;
  zakat_due_date: string | null;
  hijri_start_date: string | null;
  hijri_due_date: string | null;
  nisab_method: NisabMethod;
  gold_nisab_grams: number;
  silver_nisab_grams: number;
  current_nisab_kwd: number | null;
  hawl_status: HawlStatus;
  status: ZakatStatus;
};

export type ZakatCalculationRow = {
  id: string;
  user_id: string;
  calculation_date: string;
  nisab_value_kwd: number;
  eligible_assets_total_kwd: number;
  deductions_kwd: number;
  zakatable_amount_kwd: number;
  zakat_rate: number;
  zakat_due_kwd: number;
  hawl_status: string;
  methodology_reference: string;
  breakdown: unknown;
  created_at: string;
};

export type ZakatPayment = {
  id: string;
  user_id: string;
  calculation_id: string | null;
  amount_kwd: number;
  currency: string;
  payment_date: string;
  payment_type: "zakat";
  recipient: string | null;
  status: "paid" | "pending";
  notes: string | null;
  created_at: string;
};

/* ------------------------------------------------------------------ gold ---- */

export type GoldPurity = "18K" | "21K" | "22K" | "24K";

export const GOLD_PURITIES: GoldPurity[] = ["18K", "21K", "22K", "24K"];

/** Share of pure gold in a given karat, used to convert to 24K equivalent. */
export function purityFactor(purity: string | null | undefined): number {
  const key = (purity ?? "24K").toUpperCase().replace(/\s/g, "");
  if (key.startsWith("18")) return 18 / 24;
  if (key.startsWith("21")) return 21 / 24;
  if (key.startsWith("22")) return 22 / 24;
  return 1;
}

/** Fraction of pure silver; silver holdings are usually quoted near .999. */
export function silverPurityFactor(purity: string | null | undefined): number {
  const key = (purity ?? "").replace(/[^0-9.]/g, "");
  const parsed = Number(key);
  if (Number.isFinite(parsed) && parsed > 0) {
    if (parsed > 1 && parsed <= 100) return parsed / 100;
    if (parsed > 100) return parsed / 1000;
    return parsed;
  }
  return 1;
}

/* ----------------------------------------------------------------- rates ---- */

export function latestRate(rates: MetalRate[], metal: MetalKind): MetalRate | null {
  const rows = rates
    .filter((row) => row.metal === metal)
    .sort((a, b) => b.as_of.localeCompare(a.as_of));
  return rows[0] ?? null;
}

/**
 * Nisab in KWD, always derived: 85 × current 24K gram price (or 595 × silver).
 * Returns null when no rate is stored yet — the UI then says the reference
 * price is pending instead of inventing one.
 */
export function nisabValue(
  rates: MetalRate[],
  method: NisabMethod,
  goldGrams = GOLD_NISAB_GRAMS,
  silverGrams = SILVER_NISAB_GRAMS,
): { value: number; rate: MetalRate } | null {
  const metal: MetalKind = method === "silver" ? "silver" : "gold_24k";
  const rate = latestRate(rates, metal);
  if (!rate) return null;
  const grams = method === "silver" ? silverGrams : goldGrams;
  return { value: round(grams * Number(rate.price_per_gram)), rate };
}

/* ------------------------------------------------------------------ hijri --- */

const HIJRI = "islamic-umalqura";

function hijriParts(date: Date): { year: number; month: number; day: number } | null {
  try {
    const parts = new Intl.DateTimeFormat(`en-u-ca-${HIJRI}`, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value?.replace(/[^0-9]/g, ""));
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

/** Human Hijri label, e.g. "1447-03-12 AH". */
export function hijriLabel(value: string | Date): string | null {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  const parts = hijriParts(date);
  if (!parts) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} AH`;
}

const DAY_MS = 86_400_000;

/**
 * One complete Hijri (lunar) year after the given date — never a flat 365-day
 * Gregorian assumption. Falls back to 354 days only if the Hijri calendar is
 * unavailable in the runtime.
 */
export function addHijriYear(value: string | Date): string {
  const start = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  const startParts = hijriParts(start);
  if (!startParts) return new Date(start.getTime() + 354 * DAY_MS).toISOString().slice(0, 10);

  const target = { year: startParts.year + 1, month: startParts.month, day: startParts.day };
  // Lunar years run 354–355 days; scan a small window for the exact match.
  for (let offset = 350; offset <= 360; offset += 1) {
    const candidate = new Date(start.getTime() + offset * DAY_MS);
    const parts = hijriParts(candidate);
    if (!parts) break;
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  // Month 12 can be 29 days: settle on the first date in the next Hijri year/month.
  for (let offset = 350; offset <= 360; offset += 1) {
    const candidate = new Date(start.getTime() + offset * DAY_MS);
    const parts = hijriParts(candidate);
    if (parts && parts.year === target.year && parts.month >= target.month) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return new Date(start.getTime() + 354 * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function todayISO(now = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------ eligibility --- */

export type ZakatAssetLineType =
  | "cash"
  | "savings"
  | "gold"
  | "silver"
  | "stock"
  | "real_estate";

export type ZakatAssetLine = {
  key: string;
  assetId: string | null;
  type: ZakatAssetLineType;
  label: string;
  /** Value in the user's base currency (KWD for Kuwait accounts). */
  value: number;
  eligible: boolean;
  /** True when the treatment depends on a ruling Wazen must not decide. */
  needsReview: boolean;
  reason: string;
  method: string;
  detail?: string | undefined;
};

/** Purposes a holding can be kept for; drives its zakat treatment. */
export const HOLDING_PURPOSES = [
  "trade",
  "long_term",
  "personal_use",
  "primary_residence",
  "rental_income",
  "for_sale",
] as const;
export type HoldingPurpose = (typeof HOLDING_PURPOSES)[number];

function purposeOf(asset: Asset): string | null {
  const raw = (asset as Asset & { holding_purpose?: string | null }).holding_purpose;
  if (raw) return raw;
  if (asset.kind === "real_estate") {
    const type = (asset.property_type ?? "").toLowerCase();
    if (type.includes("residence") || type.includes("home") || type.includes("سكن")) return "primary_residence";
    if (type.includes("rent") || type.includes("إيجار")) return "rental_income";
    if (type.includes("sale") || type.includes("trade")) return "for_sale";
  }
  return null;
}

/** Savings balance held aside (goals, emergency fund, saving transfers). */
export function savingsBalance(transactions: Transaction[]): number {
  return round(
    transactions
      .filter((t) => t.kind === "saving")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
  );
}

export function assetLines(assets: Asset[], transactions: Transaction[]): ZakatAssetLine[] {
  const lines: ZakatAssetLine[] = [];

  const cash = round(Math.max(availableMoney(transactions), 0));
  lines.push({
    key: "cash",
    assetId: null,
    type: "cash",
    label: "cash",
    value: cash,
    eligible: cash > 0,
    needsReview: false,
    reason: "zakatCashReason",
    method: "zakatMethodFullValue",
  });

  const savings = savingsBalance(transactions);
  lines.push({
    key: "savings",
    assetId: null,
    type: "savings",
    label: "savings",
    value: savings,
    eligible: savings > 0,
    needsReview: false,
    reason: "zakatSavingsReason",
    method: "zakatMethodFullValue",
  });

  for (const asset of assets) {
    const value = round(marketValue(asset));
    const purpose = purposeOf(asset);

    if (asset.kind === "gold") {
      const pure = round(Number(asset.quantity) * purityFactor(asset.purity));
      lines.push({
        key: asset.id,
        assetId: asset.id,
        type: "gold",
        label: asset.name,
        value,
        eligible: value > 0,
        needsReview: purpose === "personal_use",
        reason: purpose === "personal_use" ? "zakatGoldJewelleryReason" : "zakatGoldReason",
        method: "zakatMethodCurrentMarketValue",
        detail: `${asset.quantity} g ${(asset.purity ?? "24k").toUpperCase()} → ${pure} g 24K`,
      });
      continue;
    }

    if (asset.kind === "silver") {
      const pure = round(Number(asset.quantity) * silverPurityFactor(asset.purity));
      lines.push({
        key: asset.id,
        assetId: asset.id,
        type: "silver",
        label: asset.name,
        value,
        eligible: value > 0,
        needsReview: purpose === "personal_use",
        reason: purpose === "personal_use" ? "zakatSilverJewelleryReason" : "zakatSilverReason",
        method: "zakatMethodCurrentMarketValue",
        detail: `${asset.quantity} g · ${pure} g pure`,
      });
      continue;
    }

    if (asset.kind === "stock") {
      const trading = purpose === "trade" || purpose === "for_sale";
      lines.push({
        key: asset.id,
        assetId: asset.id,
        type: "stock",
        label: asset.name,
        value,
        eligible: trading && value > 0,
        needsReview: !trading,
        reason: trading ? "zakatStockTradeReason" : "zakatStockReviewReason",
        method: trading ? "zakatMethodCurrentMarketValue" : "zakatMethodNeedsRuling",
        detail: `${asset.quantity} ${asset.symbol ?? ""}`.trim(),
      });
      continue;
    }

    // Real estate
    const forSale = purpose === "for_sale" || purpose === "trade";
    const personal = purpose === "primary_residence" || purpose === "personal_use";
    lines.push({
      key: asset.id,
      assetId: asset.id,
      type: "real_estate",
      label: asset.name,
      value,
      eligible: forSale && value > 0,
      needsReview: !forSale && !personal,
      reason: forSale
        ? "zakatPropertyForSaleReason"
        : personal
          ? "zakatPropertyPersonalReason"
          : "zakatPropertyRentalReason",
      method: forSale ? "zakatMethodCurrentMarketValue" : "zakatMethodExcluded",
      detail: asset.property_type ?? undefined,
    });
  }

  return lines;
}

/* ------------------------------------------------------------ calculation --- */

export type ZakatResult = {
  today: string;
  lines: ZakatAssetLine[];
  eligibleTotal: number;
  reviewTotal: number;
  excludedTotal: number;
  deductions: number;
  zakatableAmount: number;
  nisabKwd: number | null;
  nisabRate: MetalRate | null;
  nisabMethod: NisabMethod;
  meetsNisab: boolean;
  hawlStatus: HawlStatus;
  hawlProgress: number;
  hawlDaysRemaining: number | null;
  startDate: string | null;
  dueDate: string | null;
  hijriStart: string | null;
  hijriDue: string | null;
  status: ZakatStatus;
  zakatDue: number;
  paid: number;
  remaining: number;
  needsStartDate: boolean;
};

export function calculateZakat(input: {
  assets: Asset[];
  transactions: Transaction[];
  rates: MetalRate[];
  profile: ZakatProfile | null;
  payments: ZakatPayment[];
  deductions?: number;
  now?: Date;
}): ZakatResult {
  const today = todayISO(input.now ?? new Date());
  const method: NisabMethod = input.profile?.nisab_method === "silver" ? "silver" : "gold";
  const lines = assetLines(input.assets, input.transactions);

  const eligibleTotal = round(
    lines.filter((l) => l.eligible && !l.needsReview).reduce((s, l) => s + l.value, 0),
  );
  const reviewTotal = round(lines.filter((l) => l.needsReview).reduce((s, l) => s + l.value, 0));
  const excludedTotal = round(
    lines.filter((l) => !l.eligible && !l.needsReview).reduce((s, l) => s + l.value, 0),
  );

  const deductions = round(Math.max(input.deductions ?? 0, 0));
  const zakatableAmount = round(Math.max(eligibleTotal - deductions, 0));

  const nisab = nisabValue(
    input.rates,
    method,
    input.profile?.gold_nisab_grams ?? GOLD_NISAB_GRAMS,
    input.profile?.silver_nisab_grams ?? SILVER_NISAB_GRAMS,
  );
  const nisabKwd = nisab?.value ?? null;
  const meetsNisab = nisabKwd !== null && zakatableAmount >= nisabKwd;

  const startDate = input.profile?.zakat_start_date ?? null;
  const dueDate = startDate ? (input.profile?.zakat_due_date ?? addHijriYear(startDate)) : null;

  let hawlStatus: HawlStatus = "not_started";
  let hawlProgress = 0;
  let hawlDaysRemaining: number | null = null;
  if (startDate && dueDate) {
    const span = Math.max(daysBetween(startDate, dueDate), 1);
    const elapsed = Math.min(Math.max(daysBetween(startDate, today), 0), span);
    hawlProgress = Math.round((elapsed / span) * 100);
    hawlDaysRemaining = Math.max(daysBetween(today, dueDate), 0);
    hawlStatus = today >= dueDate ? "completed" : "in_progress";
  }

  const zakatDue = meetsNisab && hawlStatus === "completed" ? round(zakatableAmount * ZAKAT_RATE) : 0;

  const cycleStart = startDate ?? "0001-01-01";
  const paid = round(
    input.payments
      .filter((p) => p.status === "paid" && p.payment_date >= cycleStart)
      .reduce((s, p) => s + (Number(p.amount_kwd) || 0), 0),
  );
  const remaining = round(Math.max(zakatDue - paid, 0));

  let status: ZakatStatus;
  if (!meetsNisab) status = "below_nisab";
  else if (hawlStatus !== "completed") status = "hawl_in_progress";
  else if (zakatDue > 0 && remaining <= 0) status = "recorded";
  else status = "due";

  return {
    today,
    lines,
    eligibleTotal,
    reviewTotal,
    excludedTotal,
    deductions,
    zakatableAmount,
    nisabKwd,
    nisabRate: nisab?.rate ?? null,
    nisabMethod: method,
    meetsNisab,
    hawlStatus,
    hawlProgress,
    hawlDaysRemaining,
    startDate,
    dueDate,
    hijriStart: startDate ? hijriLabel(startDate) : null,
    hijriDue: dueDate ? hijriLabel(dueDate) : null,
    status,
    zakatDue,
    paid,
    remaining,
    needsStartDate: meetsNisab && !startDate,
  };
}

/** The alert may only fire when both conditions are genuinely met. */
export function isZakatDue(result: ZakatResult): boolean {
  return result.status === "due";
}

/** Only adult, independent accounts calculate their own zakat. */
export function canCalculateZakat(lifeStage: string | undefined): boolean {
  return (
    lifeStage === "university_student" ||
    lifeStage === "employee" ||
    lifeStage === "self_employed" ||
    lifeStage === "parent"
  );
}
