import type { SupabaseClient } from "@supabase/supabase-js";
import {
  entitlementsFor,
  hasFeature,
  type Entitlements,
  type PremiumFeature,
  type Subscription,
} from "@/lib/subscription";

/**
 * Server-side source of truth for subscription state. Never trust the client:
 * every premium code path must call these helpers.
 */
export async function loadEntitlements(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Entitlements> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return entitlementsFor((data ?? null) as Subscription | null);
}

/**
 * Guard for premium-only server functions. Throws a 402 Response so future
 * premium modules fail closed even if the UI forgets to hide a button.
 */
export async function requirePremium(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  feature?: PremiumFeature,
): Promise<Entitlements> {
  const entitlements = await loadEntitlements(supabase, userId);
  const allowed = feature ? hasFeature(entitlements, feature) : entitlements.isPremium;
  if (!allowed) {
    throw new Response(
      JSON.stringify({
        error: "premium_required",
        feature: feature ?? null,
        plan: entitlements.plan,
        status: entitlements.status,
      }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }
  return entitlements;
}

/** Free-plan quota guard for future modules (goals, budgets, recurring items). */
export async function assertWithinPlanLimit(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  limit: "goals" | "budgets" | "recurring_items",
  currentCount: number,
): Promise<void> {
  const entitlements = await loadEntitlements(supabase, userId);
  const max = entitlements.limits[limit];
  if (max !== null && currentCount >= max) {
    throw new Response(
      JSON.stringify({ error: "plan_limit_reached", limit, max }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }
}
