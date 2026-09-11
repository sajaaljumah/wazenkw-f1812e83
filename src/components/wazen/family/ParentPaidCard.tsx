import { EmptyState, Panel } from "@/components/wazen/dashboard/primitives";
import { ReceiptIcon, ICON_STROKE } from "@/components/wazen/icons";
import { formatDate, formatMoney } from "@/lib/finance";
import type { Transaction } from "@/lib/finance";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

/**
 * Child / teenager view of spending a parent paid for them. Amounts here belong
 * to the parent's records, so they only reduce the child's own money when the
 * parent explicitly deducted them.
 */
export function ParentPaidCard({ transactions }: { transactions: Transaction[] }) {
  const { t } = useWazenLocale();
  return (
    <Panel title={t("paidByFamily")}>
      {transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="size-5" strokeWidth={ICON_STROKE} />}
          title={t("noParentPaid")}
          description={t("noParentPaidDescription")}
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {transactions.slice(0, 8).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm">{item.merchant ?? labels.category(item.category)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {labels.category(item.category)} · {formatDate(item.occurred_on)} ·{" "}
                  {item.deducted_from_child ? t("deductedFromYou") : t("coveredByParent")}
                </p>
              </div>
              <p className="wazen-number shrink-0 text-sm">{formatMoney(Number(item.amount), item.currency)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
