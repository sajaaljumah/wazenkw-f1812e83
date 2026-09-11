import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { Panel, EmptyState, StatCard } from "@/components/wazen/dashboard/primitives";
import { Button } from "@/components/ui/button";
import {
  AddIcon,
  DeleteIcon,
  EditIcon,
  ICON_STROKE,
  IncomeIcon,
  SavingsIcon,
  ScheduledIcon,
  SpinnerIcon,
} from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  useAllRecurringItems,
  useDeleteRecurringItem,
  useToggleRecurringItem,
} from "@/hooks/use-wazen-recurring";
import { RecurringFormDialog } from "@/components/wazen/recurring/RecurringFormDialog";
import {
  formatDate,
  formatMoney,
  frequencyOf,
  monthlyCommitments,
  nextDueDate,
  recurringStatus,
} from "@/lib/finance";
import type { RecurringItem } from "@/lib/finance";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/recurring")({
  head: () => ({
    meta: [
      { title: "Recurring commitments — Wazen" },
      {
        name: "description",
        content: "Track subscriptions, bills and recurring saving transfers with their amount, frequency and next payment date.",
      },
      { property: "og:title", content: "Recurring commitments — Wazen" },
      {
        property: "og:description",
        content: "Track subscriptions, bills and recurring saving transfers with their amount, frequency and next payment date.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecurringPage,
});

const STATUS_KEY = {
  active: "statusActive",
  paused: "statusPaused",
  ended: "statusEnded",
  scheduled: "statusScheduled",
} as const;

function RecurringPage() {
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
  const { data: profile } = useProfile();
  const items = useAllRecurringItems();
  const toggle = useToggleRecurringItem();
  const remove = useDeleteRecurringItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringItem | null>(null);

  const currency = profile?.base_currency || DEFAULT_CURRENCY;
  const list = items.data ?? [];
  const totals = monthlyCommitments(list);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-8 wazen-enter">
        <header className="wazen-card">
          <p className="wazen-label">{t("recurringBadge")}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl">{t("recurringTitle")}</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">{t("recurringSubtitle")}</p>
            </div>
            <Button onClick={openNew}>
              <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
              {t("addRecurring")}
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={t("committedExpenses")}
            amount={totals.expenses}
            currency={currency}
            icon={<ScheduledIcon className="size-4" strokeWidth={ICON_STROKE} />}
            hint={t("monthlyCommitmentsTitle")}
          />
          <StatCard
            label={t("committedIncome")}
            amount={totals.income}
            currency={currency}
            tone="positive"
            icon={<IncomeIcon className="size-4" strokeWidth={ICON_STROKE} />}
            hint={t("monthlyCommitmentsTitle")}
          />
          <StatCard
            label={t("committedSavings")}
            amount={totals.savings}
            currency={currency}
            tone="gold"
            icon={<SavingsIcon className="size-4" strokeWidth={ICON_STROKE} />}
            hint={t("monthlyCommitmentsTitle")}
          />
        </section>

        <Panel title={t("recurringTitle")}>
          {items.isLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <SpinnerIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<ScheduledIcon className="size-5" strokeWidth={ICON_STROKE} />}
              title={t("noRecurring")}
              description={t("noRecurringDescription")}
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {list.map((item) => {
                const status = recurringStatus(item);
                const due = nextDueDate(item);
                const frequency = frequencyOf(item);
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("recurringBadge")}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
                            status === "active"
                              ? "bg-chart-2/12 text-chart-2"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {t(STATUS_KEY[status])}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t(frequency === "monthly" ? "monthlyFreq" : frequency)}
                        {item.merchant ? ` · ${labels.merchant(item.merchant)}` : ""} · {labels.category(item.category)}
                        {due ? ` · ${t("nextPayment")}: ${formatDate(due)}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm tabular-nums",
                        item.kind === "income" ? "text-chart-2" : "text-foreground",
                      )}
                    >
                      {item.kind === "income" ? "+" : "−"}
                      {formatMoney(Number(item.amount), item.currency || currency)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle.mutate({ id: item.id, active: !item.active })}
                      >
                        {item.active ? t("pauseLabel") : t("resumeLabel")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("editRecurring")}
                        onClick={() => {
                          setEditing(item);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon className="size-4" strokeWidth={ICON_STROKE} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("deleteLabel")}
                        onClick={async () => {
                          await remove.mutateAsync(item.id);
                          toast.success(t("recurringDeleted"));
                        }}
                      >
                        <DeleteIcon className="size-4" strokeWidth={ICON_STROKE} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <RecurringFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        currency={currency}
      />
    </AppShell>
  );
}
