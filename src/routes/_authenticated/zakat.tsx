import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel, ProgressBar, StatCard } from "@/components/wazen/dashboard/primitives";
import { ZakatAlert } from "@/components/wazen/zakat/ZakatAlert";
import { ZakatPaymentDialog } from "@/components/wazen/zakat/ZakatPaymentDialog";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  useSaveZakatCalculation,
  useSaveZakatStartDate,
  useZakat,
  useZakatCalculations,
} from "@/hooks/use-wazen-zakat";
import { formatDate, formatMoney } from "@/lib/finance";
import {
  canCalculateZakat,
  GOLD_NISAB_GRAMS,
  SILVER_NISAB_GRAMS,
  ZAKAT_REFERENCE_URL,
} from "@/lib/zakat";
import type { ZakatAssetLine } from "@/lib/zakat";
import {
  ICON_STROKE,
  MetalsIcon,
  ScheduledIcon,
  SpinnerIcon,
  ZakatIcon,
} from "@/components/wazen/icons";

export const Route = createFileRoute("/_authenticated/zakat")({
  head: () => ({
    meta: [
      { title: "Zakat — Wazen" },
      {
        name: "description",
        content:
          "Calculate your zakat in Wazen from your recorded money, savings, gold, silver, shares and property, with a dynamic nisab and Hijri hawl tracking.",
      },
      { property: "og:title", content: "Zakat — Wazen" },
      {
        property: "og:description",
        content:
          "Zakat in Wazen: dynamic nisab from the current gold gram price, Hijri hawl tracking and recorded zakat payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ZakatPage,
});

function ZakatPage() {
  const { t, locale } = useWazenLocale();
  const { data: profile } = useProfile();
  const { result, isLoading, payments, profile: zakatProfile } = useZakat();
  const history = useZakatCalculations();
  const saveStartDate = useSaveZakatStartDate();
  const saveCalculation = useSaveZakatCalculation();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [startDate, setStartDate] = useState("");

  if (!profile) {
    return (
      <AppShell>
        <div className="wazen-panel p-8 text-sm text-muted-foreground">…</div>
      </AppShell>
    );
  }

  if (!canCalculateZakat(profile.life_stage)) {
    return (
      <AppShell>
        <EmptyState
          title={t("zakatTitle")}
          description={t("zakatDisclaimer")}
          icon={<ZakatIcon className="size-5" strokeWidth={ICON_STROKE} />}
        />
      </AppShell>
    );
  }

  const currency = profile.base_currency;

  if (isLoading || !result) {
    return (
      <AppShell>
        <div className="wazen-panel flex items-center gap-3 p-8 text-sm text-muted-foreground">
          <SpinnerIcon className="size-4 animate-spin" strokeWidth={ICON_STROKE} />
          {t("zakatTitle")}
        </div>
      </AppShell>
    );
  }

  const eligible = result.lines.filter((line) => line.eligible && !line.needsReview);
  const review = result.lines.filter((line) => line.needsReview);
  const excluded = result.lines.filter((line) => !line.eligible && !line.needsReview);

  async function submitStartDate() {
    const value = startDate || result!.today;
    try {
      await saveStartDate.mutateAsync({
        startDate: value,
        nisabMethod: result!.nisabMethod,
        nisabKwd: result!.nisabKwd,
      });
      toast.success(t("savedToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <AppShell>
      <div className="space-y-7 wazen-enter">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="wazen-eyebrow">{t("zakat")}</p>
            <h1 className="mt-1 text-3xl">{t("zakatTitle")}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("zakatSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setPaymentOpen(true)} variant="outline">
              {t("zakatRecordPayment")}
            </Button>
            <Button
              onClick={async () => {
                try {
                  await saveCalculation.mutateAsync(result);
                  toast.success(t("zakatCalculationSaved"));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Something went wrong");
                }
              }}
              disabled={saveCalculation.isPending}
            >
              {saveCalculation.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
              {t("zakatSaveCalculation")}
            </Button>
          </div>
        </header>

        <ZakatAlert result={result} currency={currency} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("nisabValue")}
            value={result.nisabKwd === null ? t("nisabPending") : formatMoney(result.nisabKwd, currency)}
            hint={result.nisabMethod === "silver" ? t("nisabSilver") : t("nisabGold")}
            icon={<MetalsIcon className="size-4" strokeWidth={ICON_STROKE} />}
          />
          <StatCard
            label={t("zakatableWealth")}
            value={formatMoney(result.zakatableAmount, currency)}
            hint={t("zakatRate")}
          />
          <StatCard
            label={t("zakatAmount")}
            value={formatMoney(result.zakatDue, currency)}
            hint={`${t("zakatPaid")}: ${formatMoney(result.paid, currency)}`}
            icon={<ZakatIcon className="size-4" strokeWidth={ICON_STROKE} />}
          />
          <StatCard
            label={t("zakatRemaining")}
            value={formatMoney(result.remaining, currency)}
            hint={result.dueDate ? `${t("zakatDueDate")}: ${formatDate(result.dueDate)}` : t("zakatNeedsStartDate")}
            icon={<ScheduledIcon className="size-4" strokeWidth={ICON_STROKE} />}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={t("hawl")}>
            {result.startDate ? (
              <div className="space-y-4">
                <ProgressBar value={result.hawlProgress} max={100} />
                <p className="text-sm text-muted-foreground">
                  {t("hawlProgress")}: {result.hawlProgress}%
                  {result.hawlDaysRemaining !== null
                    ? ` · ${result.hawlDaysRemaining} ${t("hawlDaysRemaining")}`
                    : ""}
                </p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="wazen-label">{t("zakatStartDate")}</dt>
                    <dd>{result.startDate}</dd>
                    <dd className="text-xs text-muted-foreground">{result.hijriStart}</dd>
                  </div>
                  <div>
                    <dt className="wazen-label">{t("zakatDueDate")}</dt>
                    <dd>{result.dueDate}</dd>
                    <dd className="text-xs text-muted-foreground">{result.hijriDue}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  {t("nisabMethod")}:{" "}
                  {result.nisabMethod === "silver"
                    ? `${zakatProfile?.silver_nisab_grams ?? SILVER_NISAB_GRAMS} g`
                    : `${zakatProfile?.gold_nisab_grams ?? GOLD_NISAB_GRAMS} g`}
                  {result.nisabRate
                    ? ` · ${t("zakatRatesAsOf")} ${result.nisabRate.as_of} (${formatMoney(
                        Number(result.nisabRate.price_per_gram),
                        result.nisabRate.currency,
                      )}/g)`
                    : ""}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-base font-semibold">{t("zakatSetHawl")}</p>
                <p className="text-sm text-muted-foreground">{t("zakatSetHawlBody")}</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="wazen-label">{t("zakatStartDate")}</span>
                    <input
                      className="wazen-field mt-2"
                      type="date"
                      value={startDate || result.today}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <Button onClick={submitStartDate} disabled={saveStartDate.isPending}>
                    {saveStartDate.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                    {t("zakatSaveStartDate")}
                  </Button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title={t("zakatExplanation")}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("zakatExplanationBody")}</p>
              <p>{t("zakatSeparateSadaqah")}</p>
              <p>{t("zakatDisclaimer")}</p>
              <p className="font-semibold text-foreground">{t("zakatReference")}</p>
              <a
                href={ZAKAT_REFERENCE_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block text-primary underline underline-offset-4"
              >
                {t("zakatReferenceLink")}
              </a>
            </div>
          </Panel>
        </div>

        <Panel title={t("zakatBreakdown")}>
          <div className="space-y-6">
            <LineGroup title={t("zakatEligible")} lines={eligible} currency={currency} />
            {review.length > 0 ? (
              <div>
                <LineGroup title={t("zakatNeedsReview")} lines={review} currency={currency} />
                <p className="mt-2 text-xs text-muted-foreground">{t("zakatNeedsReviewBody")}</p>
              </div>
            ) : null}
            {excluded.length > 0 ? (
              <LineGroup title={t("zakatExcluded")} lines={excluded} currency={currency} />
            ) : null}
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title={t("zakatPaymentHistory")}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("zakatNoPayments")}</p>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-semibold">
                        {formatMoney(Number(payment.amount_kwd), payment.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payment.payment_date}
                        {payment.recipient ? ` · ${payment.recipient}` : ""}
                      </span>
                    </span>
                    <span className="wazen-label">{t("zakat")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("zakatCalculationHistory")}>
            {(history.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("zakatNoPayments")}</p>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {(history.data ?? []).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-semibold">
                        {formatMoney(Number(row.zakat_due_kwd), currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          new Date(`${row.calculation_date}T00:00:00`),
                        )}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("zakatableWealth")}: {formatMoney(Number(row.zakatable_amount_kwd), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("zakatReference")} ·{" "}
          <a
            href={ZAKAT_REFERENCE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-4"
          >
            zakathouse.org.kw
          </a>
        </p>
      </div>

      <ZakatPaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        currency={currency}
        suggestedAmount={result.remaining}
      />
    </AppShell>
  );
}

function LineGroup({
  title,
  lines,
  currency,
}: {
  title: string;
  lines: ZakatAssetLine[];
  currency: string;
}) {
  const { t } = useWazenLocale();
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="wazen-label">{title}</p>
      <ul className="mt-2 divide-y divide-border/60 text-sm">
        {lines.map((line) => (
          <li key={line.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-semibold">
                {line.type === "cash" || line.type === "savings"
                  ? t(line.label as "cash")
                  : line.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t(line.reason as "zakatCashReason")}
                {line.detail ? ` · ${line.detail}` : ""}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-semibold">{formatMoney(line.value, currency)}</span>
              <span className="block text-xs text-muted-foreground">
                {t(line.method as "zakatMethodFullValue")}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
