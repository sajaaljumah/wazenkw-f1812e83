import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryChartIcon as CategoryIcon, TrendChartIcon, ICON_STROKE } from "@/components/wazen/icons";
import { EmptyState, Panel } from "./primitives";
import { formatMoney, monthKeyOf, monthlySeries, spendingByCategory } from "@/lib/finance";
import type { Transaction } from "@/lib/finance";

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const TOOLTIP_STYLE = {
  borderRadius: "0.75rem",
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
  fontSize: "0.78rem",
  boxShadow: "var(--shadow-soft)",
} as const;

/**
 * Spending by category — ranked horizontal bars.
 * Reads like a bank statement breakdown: ordered, labelled, comparable.
 */
export function SpendingByCategoryCard({
  transactions,
  currency,
  title = "Spending by category",
}: {
  transactions: Transaction[];
  currency: string;
  title?: string;
}) {
  const slices = spendingByCategory(transactions).slice(0, 6);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const max = slices.reduce((peak, slice) => Math.max(peak, slice.amount), 0);

  return (
    <Panel title={title}>
      {slices.length === 0 ? (
        <EmptyState
          icon={<CategoryIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title="No spending this month yet"
          description="Once you add expenses, your categories will appear here."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/70 pb-4">
            <span className="wazen-label">Total</span>
            <span className="wazen-number text-lg">{formatMoney(total, currency)}</span>
          </div>
          <ul className="space-y-4">
            {slices.map((slice, index) => {
              const share = total > 0 ? Math.round((slice.amount / total) * 100) : 0;
              const width = max > 0 ? Math.max((slice.amount / max) * 100, 3) : 0;
              const color = BAR_COLORS[index % BAR_COLORS.length];
              return (
                <li key={slice.category} className="group">
                   <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="size-2 rounded-full" style={{ background: color }} />
                      <span className="truncate">{slice.category}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {share}% · <span className="text-foreground">{formatMoney(slice.amount, currency)}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out group-hover:opacity-90"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 62%, white))`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/**
 * Income vs expenses — grouped bars with a net line on top, so the month-to-month
 * story (and whether the month closed positive) is readable at a glance.
 */
export function IncomeVsExpensesCard({
  transactions,
  currency,
  months = 6,
}: {
  transactions: Transaction[];
  currency: string;
  months?: number;
}) {
  const series = monthlySeries(transactions, months).map((point) => ({
    ...point,
    net: point.income - point.expenses,
  }));
  const hasData = series.some((point) => point.income > 0 || point.expenses > 0);

  return (
    <Panel title="Income vs expenses">
      {!hasData ? (
        <EmptyState
          icon={<TrendChartIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title="Not enough data yet"
          description="Add income and expenses to see how your months compare."
        />
      ) : (
         <div className="h-52 w-full min-w-0 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
             <ComposedChart data={series} barGap={3} margin={{ top: 8, right: 2, bottom: 0, left: -28 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                 interval="preserveStartEnd"
                 minTickGap={18}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                 width={48}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => Intl.NumberFormat(undefined, { notation: "compact" }).format(Number(value))}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)", opacity: 0.45 }}
                formatter={(value) => formatMoney(Number(value), currency)}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="income" fill="var(--chart-2)" radius={[5, 5, 0, 0]} maxBarSize={16} animationDuration={700} />
              <Bar dataKey="expenses" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={16} animationDuration={700} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="var(--foreground)"
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: "var(--card)", strokeWidth: 1.5 }}
                activeDot={{ r: 4 }}
                animationDuration={900}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: "var(--chart-2)" }} /> Income
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: "var(--chart-1)" }} /> Expenses
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-4" style={{ background: "var(--foreground)" }} /> Net
        </span>
      </div>
    </Panel>
  );
}

/** Cumulative savings — a calm gradient area chart showing balance building over time. */
export function SavingsTrendCard({
  transactions,
  currency,
  months = 12,
  title = "Savings over time",
}: {
  transactions: Transaction[];
  currency: string;
  months?: number;
  title?: string;
}) {
  const buckets = new Map<string, number>();
  const now = new Date();
  const keys: string[] = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    keys.push(key);
    buckets.set(key, 0);
  }
  for (const item of transactions) {
    if (item.kind !== "saving") continue;
    const key = monthKeyOf(item.occurred_on);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(item.amount));
  }
  let running = 0;
  const series = keys.map((key) => {
    running += buckets.get(key) ?? 0;
    return { label: key.slice(5), total: Math.round(running * 100) / 100 };
  });
  const hasData = series.some((point) => point.total > 0);

  return (
    <Panel title={title}>
      {!hasData ? (
        <EmptyState
          icon={<TrendChartIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title="No savings recorded yet"
          description="Every amount you save will build this line."
        />
      ) : (
         <div className="h-48 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
             <ComposedChart data={series} margin={{ top: 8, right: 2, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="wazen-savings-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                interval="preserveStartEnd"
                 minTickGap={18}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                 width={48}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) => Intl.NumberFormat(undefined, { notation: "compact" }).format(Number(value))}
              />
              <Tooltip formatter={(value) => formatMoney(Number(value), currency)} contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#wazen-savings-area)"
                animationDuration={900}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
