import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CategoryChartIcon as PieIcon, TrendChartIcon, ICON_STROKE } from "@/components/wazen/icons";
import { EmptyState, Panel } from "./primitives";
import { formatMoney, monthlySeries, spendingByCategory } from "@/lib/finance";
import type { Transaction } from "@/lib/finance";

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SpendingByCategoryCard({
  transactions,
  currency,
  title = "Spending by category",
}: {
  transactions: Transaction[];
  currency: string;
  title?: string;
}) {
  const slices = spendingByCategory(transactions).slice(0, 5);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <Panel title={title}>
      {slices.length === 0 ? (
        <EmptyState
          icon={<PieIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title="No spending this month yet"
          description="Once you add expenses, your categories will appear here."
        />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={44}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                  animationDuration={650}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.category} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                  contentStyle={{
                    borderRadius: "0.875rem",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    fontSize: "0.8rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-3">
            {slices.map((slice, index) => (
              <li key={slice.category} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
                  />
                  {slice.category}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {total > 0 ? `${Math.round((slice.amount / total) * 100)}% · ` : ""}
                  {formatMoney(slice.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function IncomeVsExpensesCard({
  transactions,
  currency,
  months = 6,
}: {
  transactions: Transaction[];
  currency: string;
  months?: number;
}) {
  const series = monthlySeries(transactions, months);
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
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                formatter={(value) => formatMoney(Number(value), currency)}
                contentStyle={{
                  borderRadius: "0.875rem",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                  fontSize: "0.8rem",
                }}
              />
              <Bar dataKey="income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={650} />
              <Bar dataKey="expenses" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={650} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: "var(--chart-2)" }} /> Income
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: "var(--chart-1)" }} /> Expenses
        </span>
      </div>
    </Panel>
  );
}
