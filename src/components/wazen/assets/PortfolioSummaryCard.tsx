import { Link } from "@tanstack/react-router";
import { Panel, EmptyState } from "@/components/wazen/dashboard/primitives";
import {
  ForwardIcon,
  GainIcon,
  LossIcon,
  MetalsIcon,
  PortfolioIcon,
  PropertyIcon,
  StocksIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { formatMoney } from "@/lib/finance";
import { portfolioTotals } from "@/lib/assets";
import type { Asset, AssetKind } from "@/lib/assets";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

const KIND_META: Record<AssetKind, { key: "kindStock" | "kindGold" | "kindSilver" | "kindRealEstate"; icon: typeof StocksIcon }> = {
  stock: { key: "kindStock", icon: StocksIcon },
  gold: { key: "kindGold", icon: MetalsIcon },
  silver: { key: "kindSilver", icon: MetalsIcon },
  real_estate: { key: "kindRealEstate", icon: PropertyIcon },
};

/** Dashboard summary of owned assets — always kept apart from available money. */
export function PortfolioSummaryCard({ assets, currency }: { assets: Asset[]; currency: string }) {
  const { t } = useWazenLocale();
  const totals = portfolioTotals(assets);
  const positive = totals.gain >= 0;

  return (
    <Panel
      title={t("portfolioSummary")}
      action={
        <Link to="/assets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {t("viewPortfolio")}
          <ForwardIcon className="size-4" strokeWidth={ICON_STROKE} />
        </Link>
      }
    >
      {assets.length === 0 ? (
        <EmptyState
          icon={<PortfolioIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title={t("noAssets")}
          description={t("noAssetsDescription")}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="wazen-label">{t("totalAssetValue")}</p>
              <p className="wazen-number mt-2 text-2xl sm:text-3xl">{formatMoney(totals.value, currency)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("notSpendable")}</p>
            </div>
            <p
              className={`wazen-number inline-flex items-center gap-1.5 text-sm ${positive ? "text-chart-2" : "text-destructive"}`}
            >
              {positive ? (
                <GainIcon className="size-4" strokeWidth={ICON_STROKE} />
              ) : (
                <LossIcon className="size-4" strokeWidth={ICON_STROKE} />
              )}
              {formatMoney(totals.gain, currency)} · {totals.gainPercent.toFixed(1)}%
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {totals.byKind.map((entry) => {
              const meta = KIND_META[entry.kind];
              const Icon = meta.icon;
              return (
                <li
                  key={entry.kind}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    <Icon className="size-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
                    {t(meta.key)}
                    <span className="text-xs text-muted-foreground">· {entry.count}</span>
                  </span>
                  <span className="wazen-number text-sm">{formatMoney(entry.value, currency)}</span>
                </li>
              );
            })}
          </ul>

          {totals.annualRentalIncome > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("annualRentalIncome")}:{" "}
              <span className="wazen-number text-foreground">
                {formatMoney(totals.annualRentalIncome, currency)}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
