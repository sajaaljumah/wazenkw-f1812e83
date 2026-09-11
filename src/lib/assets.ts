/**
 * Wazen asset model.
 *
 * Assets (shares, gold, silver, real estate) are wealth the user owns. They are
 * deliberately kept out of every "available money" calculation: they are not
 * spendable cash. Every number here is derived from stored rows — quantities,
 * purchase prices and recorded valuations — never from static placeholders.
 */

export type AssetKind = "stock" | "gold" | "silver" | "real_estate";

export const ASSET_KINDS: AssetKind[] = ["stock", "gold", "silver", "real_estate"];

export type Asset = {
  id: string;
  user_id: string;
  kind: AssetKind;
  name: string;
  symbol: string | null;
  currency: string;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  current_unit_value: number;
  purity: string | null;
  property_type: string | null;
  monthly_rent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetValuation = {
  id: string;
  asset_id: string;
  valued_on: string;
  unit_value: number;
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Units are shares for stocks, grams for metals and a single unit for property. */
export function unitOf(kind: AssetKind): "shares" | "grams" | "property" {
  if (kind === "stock") return "shares";
  if (kind === "gold" || kind === "silver") return "grams";
  return "property";
}

export function costBasis(asset: Asset): number {
  return num(asset.quantity) * num(asset.unit_cost);
}

export function marketValue(asset: Asset): number {
  return num(asset.quantity) * num(asset.current_unit_value);
}

export function gainOf(asset: Asset): number {
  return marketValue(asset) - costBasis(asset);
}

export function gainPercentOf(asset: Asset): number {
  const cost = costBasis(asset);
  if (cost <= 0) return 0;
  return (gainOf(asset) / cost) * 100;
}

export function annualRentOf(asset: Asset): number {
  return num(asset.monthly_rent) * 12;
}

export type PortfolioKindTotals = {
  kind: AssetKind;
  count: number;
  cost: number;
  value: number;
  gain: number;
};

export type PortfolioTotals = {
  cost: number;
  value: number;
  gain: number;
  gainPercent: number;
  annualRentalIncome: number;
  byKind: PortfolioKindTotals[];
};

export function portfolioTotals(assets: Asset[]): PortfolioTotals {
  let cost = 0;
  let value = 0;
  let annualRentalIncome = 0;
  const kinds = new Map<AssetKind, PortfolioKindTotals>();

  for (const asset of assets) {
    const assetCost = costBasis(asset);
    const assetValue = marketValue(asset);
    cost += assetCost;
    value += assetValue;
    annualRentalIncome += annualRentOf(asset);

    const entry =
      kinds.get(asset.kind) ?? { kind: asset.kind, count: 0, cost: 0, value: 0, gain: 0 };
    entry.count += 1;
    entry.cost += assetCost;
    entry.value += assetValue;
    entry.gain = entry.value - entry.cost;
    kinds.set(asset.kind, entry);
  }

  return {
    cost,
    value,
    gain: value - cost,
    gainPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
    annualRentalIncome,
    byKind: ASSET_KINDS.map((kind) => kinds.get(kind)).filter(
      (entry): entry is PortfolioKindTotals => !!entry,
    ),
  };
}

export function valuationsFor(valuations: AssetValuation[], assetId: string): AssetValuation[] {
  return valuations
    .filter((row) => row.asset_id === assetId)
    .sort((a, b) => a.valued_on.localeCompare(b.valued_on));
}

export type PortfolioPoint = { date: string; value: number };

/**
 * Total portfolio value on each date the user has recorded a valuation, using
 * the last known value of every asset already owned on that date.
 */
export function portfolioSeries(assets: Asset[], valuations: AssetValuation[]): PortfolioPoint[] {
  if (assets.length === 0 || valuations.length === 0) return [];
  const dates = [...new Set(valuations.map((row) => row.valued_on))].sort();
  const byAsset = new Map<string, AssetValuation[]>();
  for (const asset of assets) byAsset.set(asset.id, valuationsFor(valuations, asset.id));

  return dates.map((date) => {
    let value = 0;
    for (const asset of assets) {
      if (asset.purchase_date > date) continue;
      const history = byAsset.get(asset.id) ?? [];
      let unitValue: number | null = null;
      for (const row of history) {
        if (row.valued_on <= date) unitValue = num(row.unit_value);
        else break;
      }
      value += num(asset.quantity) * (unitValue ?? num(asset.unit_cost));
    }
    return { date, value };
  });
}

/** Life stages that may own assets — children and teenagers never can. */
export function canOwnAssets(lifeStage: string | undefined): boolean {
  return lifeStage === "university_student" || lifeStage === "employee" || lifeStage === "self_employed" || lifeStage === "parent";
}
