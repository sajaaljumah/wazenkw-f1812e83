import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import type { RecurringFrequency, RecurringItem, RecurringKind } from "@/lib/finance";

/** Every recurring commitment, paused ones included, for the management screen. */
export function useAllRecurringItems() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["recurring-all", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<RecurringItem[]> => {
      const { data, error } = await supabase
        .from("recurring_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("active", { ascending: false })
        .order("day_of_month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RecurringItem[];
    },
  });
}

export type RecurringInput = {
  id?: string;
  kind: RecurringKind;
  name: string;
  merchant: string | null;
  category: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  day_of_month: number;
  start_date: string;
  ends_on: string | null;
  note: string | null;
  active: boolean;
};

function useInvalidateRecurring() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recurring-all"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring"] }),
    ]);
  };
}

export function useSaveRecurringItem() {
  const { user } = useSession();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async (input: RecurringInput) => {
      const row = {
        user_id: user!.id,
        kind: input.kind,
        name: input.name,
        merchant: input.merchant,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        day_of_month: input.day_of_month,
        start_date: input.start_date,
        ends_on: input.ends_on,
        note: input.note,
        active: input.active,
      };
      if (input.id) {
        const { error } = await supabase.from("recurring_items").update(row).eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("recurring_items").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useToggleRecurringItem() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("recurring_items").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRecurringItem() {
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
