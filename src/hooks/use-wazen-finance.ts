import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import { firstOfMonth } from "@/lib/finance";
import type { Budget, Goal, RecurringItem, Transaction } from "@/lib/finance";
import type { Profile } from "@/lib/wazen";

/** All queries are scoped to the signed-in user; RLS enforces this server-side too. */
export function useTransactions() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });
}

export function useGoals() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["goals", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Goal[];
    },
  });
}

export function useMonthlyBudget() {
  const { user, loading } = useSession();
  const period = firstOfMonth();
  return useQuery({
    queryKey: ["budget", user?.id, period],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Budget | null> => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("period_month", period)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Budget | null;
    },
  });
}

export function useRecurringItems() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["recurring", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<RecurringItem[]> => {
      const { data, error } = await supabase
        .from("recurring_items")
        .select("*")
        .eq("user_id", user!.id)
        .eq("active", true)
        .order("day_of_month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RecurringItem[];
    },
  });
}

export type FamilyMemberSummary = {
  profile: Profile;
  canFund: boolean;
  canMonitor: boolean;
  transactions: Transaction[];
  goals: Goal[];
};

/**
 * Parents only: linked children/teenagers they are permitted to see.
 * Reads rely entirely on the family permissions stored in the database.
 */
export function useFamilySummary(enabled: boolean) {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["family-summary", user?.id],
    enabled: enabled && !loading && !!user,
    queryFn: async (): Promise<FamilyMemberSummary[]> => {
      const { data: links, error: linkError } = await supabase
        .from("family_relationships")
        .select("child_user_id, permissions, status")
        .eq("parent_user_id", user!.id)
        .eq("status", "active");
      if (linkError) throw linkError;

      const rows = links ?? [];
      const allowed = rows.filter((row) => {
        const permissions = (row.permissions ?? {}) as Record<string, unknown>;
        return permissions["can_monitor"] === true || permissions["can_fund"] === true;
      });
      if (allowed.length === 0) return [];

      const ids = allowed.map((row) => row.child_user_id);
      const [profilesRes, txRes, goalsRes] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("transactions").select("*").in("user_id", ids),
        supabase.from("goals").select("*").in("user_id", ids),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (txRes.error) throw txRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const transactions = (txRes.data ?? []) as unknown as Transaction[];
      const goals = (goalsRes.data ?? []) as unknown as Goal[];

      return ((profilesRes.data ?? []) as unknown as Profile[])
        .map((profile) => {
          const link = allowed.find((row) => row.child_user_id === profile.id);
          const permissions = (link?.permissions ?? {}) as Record<string, unknown>;
          return {
            profile,
            canFund: permissions["can_fund"] === true,
            canMonitor: permissions["can_monitor"] === true,
            transactions: transactions.filter((t) => t.user_id === profile.id),
            goals: goals.filter((g) => g.user_id === profile.id),
          };
        })
        .sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name));
    },
  });
}
