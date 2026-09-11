import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import { useAssets } from "@/hooks/use-wazen-assets";
import { useTransactions } from "@/hooks/use-wazen-finance";
import {
  addHijriYear,
  calculateZakat,
  hijriLabel,
  ZAKAT_METHODOLOGY_REFERENCE,
  ZAKAT_RATE,
} from "@/lib/zakat";
import type {
  MetalRate,
  ZakatCalculationRow,
  ZakatPayment,
  ZakatProfile,
  ZakatResult,
} from "@/lib/zakat";

/** Reference gram prices — stored rows, updatable by the backend integration. */
export function useMetalRates() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["metal-rates"],
    enabled: !loading && !!user,
    queryFn: async (): Promise<MetalRate[]> => {
      const { data, error } = await supabase
        .from("metal_rates")
        .select("id, metal, price_per_gram, currency, as_of, source")
        .order("as_of", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MetalRate[];
    },
  });
}

export function useZakatProfile() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["zakat-profile", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<ZakatProfile | null> => {
      const { data, error } = await supabase
        .from("zakat_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ZakatProfile | null;
    },
  });
}

export function useZakatPayments() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["zakat-payments", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<ZakatPayment[]> => {
      const { data, error } = await supabase
        .from("zakat_payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ZakatPayment[];
    },
  });
}

export function useZakatCalculations() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["zakat-calculations", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<ZakatCalculationRow[]> => {
      const { data, error } = await supabase
        .from("zakat_calculations")
        .select("*")
        .eq("user_id", user!.id)
        .order("calculation_date", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as unknown as ZakatCalculationRow[];
    },
  });
}

/**
 * Live zakat picture, computed from the same stored financial data the rest of
 * Wazen uses — no second balance system.
 */
export function useZakat(): {
  result: ZakatResult | null;
  isLoading: boolean;
  profile: ZakatProfile | null;
  payments: ZakatPayment[];
  rates: MetalRate[];
} {
  const transactions = useTransactions();
  const assets = useAssets();
  const rates = useMetalRates();
  const zakatProfile = useZakatProfile();
  const payments = useZakatPayments();

  const isLoading =
    transactions.isLoading || assets.isLoading || rates.isLoading || zakatProfile.isLoading || payments.isLoading;

  const result = isLoading
    ? null
    : calculateZakat({
        assets: assets.data ?? [],
        transactions: transactions.data ?? [],
        rates: rates.data ?? [],
        profile: zakatProfile.data ?? null,
        payments: payments.data ?? [],
      });

  return {
    result,
    isLoading,
    profile: zakatProfile.data ?? null,
    payments: payments.data ?? [],
    rates: rates.data ?? [],
  };
}

function useInvalidateZakat() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["zakat-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["zakat-payments"] }),
      queryClient.invalidateQueries({ queryKey: ["zakat-calculations"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };
}

/** Sets or confirms the date the user's wealth first reached nisab. */
export function useSaveZakatStartDate() {
  const { user } = useSession();
  const invalidate = useInvalidateZakat();
  return useMutation({
    mutationFn: async ({
      startDate,
      nisabMethod,
      nisabKwd,
    }: {
      startDate: string;
      nisabMethod?: "gold" | "silver";
      nisabKwd?: number | null;
    }) => {
      const dueDate = addHijriYear(startDate);
      const { error } = await supabase.from("zakat_profiles").upsert(
        {
          user_id: user!.id,
          zakat_start_date: startDate,
          zakat_due_date: dueDate,
          hijri_start_date: hijriLabel(startDate),
          hijri_due_date: hijriLabel(dueDate),
          ...(nisabMethod ? { nisab_method: nisabMethod } : {}),
          ...(nisabKwd != null ? { current_nisab_kwd: nisabKwd } : {}),
          hawl_status: "in_progress",
          status: "hawl_in_progress",
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      return dueDate;
    },
    onSuccess: invalidate,
  });
}

/** Stores an immutable snapshot of the current calculation plus its asset lines. */
export function useSaveZakatCalculation() {
  const { user } = useSession();
  const invalidate = useInvalidateZakat();
  return useMutation({
    mutationFn: async (result: ZakatResult) => {
      const { data, error } = await supabase
        .from("zakat_calculations")
        .insert({
          user_id: user!.id,
          calculation_date: result.today,
          nisab_value_kwd: result.nisabKwd ?? 0,
          eligible_assets_total_kwd: result.eligibleTotal,
          deductions_kwd: result.deductions,
          zakatable_amount_kwd: result.zakatableAmount,
          zakat_rate: ZAKAT_RATE,
          zakat_due_kwd: result.zakatDue,
          hawl_status: result.hawlStatus,
          methodology_reference: ZAKAT_METHODOLOGY_REFERENCE,
          breakdown: result.lines as unknown as never,
        })
        .select("id")
        .single();
      if (error) throw error;
      const calculationId = (data as { id: string }).id;

      const rows = result.lines.map((line) => ({
        user_id: user!.id,
        calculation_id: calculationId,
        asset_type: line.type,
        asset_id: line.assetId,
        eligible: line.eligible && !line.needsReview,
        eligibility_reason: line.reason,
        value_kwd: line.value,
        calculation_method: line.method,
        calculation_date: result.today,
      }));
      if (rows.length > 0) {
        const { error: linesError } = await supabase.from("zakat_assets").insert(rows);
        if (linesError) throw linesError;
      }
      return calculationId;
    },
    onSuccess: invalidate,
  });
}

export type ZakatPaymentInput = {
  amount: number;
  currency: string;
  paymentDate: string;
  recipient: string | null;
  notes: string | null;
  status: "paid" | "pending";
  calculationId?: string | null;
};

/**
 * Records a zakat payment. It is deliberately its own record type: sadaqah
 * (giving) is never treated as zakat, and zakat is never treated as sadaqah.
 */
export function useRecordZakatPayment() {
  const { user } = useSession();
  const invalidate = useInvalidateZakat();
  return useMutation({
    mutationFn: async (input: ZakatPaymentInput) => {
      let transactionId: string | null = null;
      if (input.status === "paid") {
        const { data, error } = await supabase
          .from("transactions")
          .insert({
            user_id: user!.id,
            kind: "expense",
            category: "Zakat",
            merchant: input.recipient,
            amount: input.amount,
            currency: input.currency,
            occurred_on: input.paymentDate,
            note: input.notes,
          })
          .select("id")
          .single();
        if (error) throw error;
        transactionId = (data as { id: string }).id;
      }

      const { error: paymentError } = await supabase.from("zakat_payments").insert({
        user_id: user!.id,
        calculation_id: input.calculationId ?? null,
        amount_kwd: input.amount,
        currency: input.currency,
        payment_date: input.paymentDate,
        payment_type: "zakat",
        recipient: input.recipient,
        status: input.status,
        notes: input.notes,
        transaction_id: transactionId,
      });
      if (paymentError) throw paymentError;
    },
    onSuccess: invalidate,
  });
}
