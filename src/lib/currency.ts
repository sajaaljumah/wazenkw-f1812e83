/**
 * Wazen's currency layer.
 *
 * Wazen currently targets Kuwait, so KWD is the default currency everywhere.
 * Conversion is deliberately expressed as a provider interface: a live exchange
 * rate API can be wired behind `ExchangeRateProvider` later (in the backend/API
 * layer) without touching any screen. Nothing here calls an external service and
 * no API key belongs in this file.
 */

export type CurrencyCode = string;

export const DEFAULT_CURRENCY: CurrencyCode = "KWD";

export type CurrencyMeta = {
  code: CurrencyCode;
  /** Minor-unit digits used for display and rounding. */
  digits: number;
  nameEn: string;
  nameAr: string;
};

/** Currencies Wazen presents today. KWD is first because Kuwait is the home market. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "KWD", digits: 3, nameEn: "Kuwaiti dinar", nameAr: "دينار كويتي" },
  { code: "SAR", digits: 2, nameEn: "Saudi riyal", nameAr: "ريال سعودي" },
  { code: "AED", digits: 2, nameEn: "UAE dirham", nameAr: "درهم إماراتي" },
  { code: "BHD", digits: 3, nameEn: "Bahraini dinar", nameAr: "دينار بحريني" },
  { code: "QAR", digits: 2, nameEn: "Qatari riyal", nameAr: "ريال قطري" },
  { code: "OMR", digits: 3, nameEn: "Omani rial", nameAr: "ريال عماني" },
  { code: "USD", digits: 2, nameEn: "US dollar", nameAr: "دولار أمريكي" },
  { code: "EUR", digits: 2, nameEn: "Euro", nameAr: "يورو" },
  { code: "GBP", digits: 2, nameEn: "British pound", nameAr: "جنيه إسترليني" },
];

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return (
    CURRENCIES.find((item) => item.code === code) ?? {
      code,
      digits: 2,
      nameEn: code,
      nameAr: code,
    }
  );
}

export function currencyDigits(code: CurrencyCode): number {
  return currencyMeta(code).digits;
}

export function currencyName(code: CurrencyCode, language: "en" | "ar"): string {
  const meta = currencyMeta(code);
  return language === "ar" ? meta.nameAr : meta.nameEn;
}

/** A snapshot of rates expressed as "1 unit of base = rates[code] units of code". */
export type RateSnapshot = {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  /** When the snapshot was produced. */
  asOf: string;
  /** Where the numbers came from; "none" means no rate source is connected yet. */
  source: "none" | "stored" | "api";
};

export type ExchangeRateProvider = {
  /**
   * Returns a rate snapshot, or null when no rate source is available.
   * A future currency API implementation plugs in here.
   */
  getRates(base: CurrencyCode): Promise<RateSnapshot | null>;
};

/**
 * The provider Wazen ships with today: no external rate source is connected, so
 * it reports that rates are unavailable instead of inventing numbers.
 */
export const unavailableRateProvider: ExchangeRateProvider = {
  async getRates() {
    return null;
  },
};

let activeProvider: ExchangeRateProvider = unavailableRateProvider;

/** Swap in a real provider once the backend/API layer exists. */
export function setExchangeRateProvider(provider: ExchangeRateProvider): void {
  activeProvider = provider;
}

export function exchangeRateProvider(): ExchangeRateProvider {
  return activeProvider;
}

export type ConversionResult = {
  amount: number | null;
  rate: number | null;
  /** True when the two currencies match and no rate is needed. */
  identity: boolean;
};

/**
 * Pure conversion helper. With no snapshot it only resolves the identity case,
 * which keeps every calculation honest until a rate source is connected.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  snapshot?: RateSnapshot | null,
): ConversionResult {
  if (from === to) return { amount, rate: 1, identity: true };
  if (!snapshot) return { amount: null, rate: null, identity: false };
  const rates = { ...snapshot.rates, [snapshot.base]: 1 };
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return { amount: null, rate: null, identity: false };
  const rate = toRate / fromRate;
  return { amount: amount * rate, rate, identity: false };
}
