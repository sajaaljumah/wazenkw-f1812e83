import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEntitlements,
  hasFeature,
  type Entitlements,
  type FamilyMemberRow,
  type PremiumFeature,
  type PriceConfig,
  type Subscription,
} from "@/lib/subscription";

/**
 * Server-side source of truth for subscription state. Never trust the client:
 * every premium code path must call these helpers. Premium access is derived
 * from the user's own subscription AND their family subscription seat.
 */
export async function loadEntitlements(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Entitlements> {
  const [ownRes, memberRes, pricesRes] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("family_members")
      .select("id, family_id, user_id, member_role, seat_kind, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("subscription_prices").select("*").eq("active", true),
  ]);

  if (ownRes.error) throw ownRes.error;
  if (memberRes.error) throw memberRes.error;

  const ownSubscription = (ownRes.data ?? null) as Subscription | null;
  const membership = (memberRes.data ?? null) as FamilyMemberRow | null;
  const prices = (pricesRes.data ?? []) as PriceConfig[];

  let familySubscription: Subscription | null = null;
  let familyMembers: FamilyMemberRow[] = [];

  if (membership) {
    const [subRes, membersRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("family_id", membership.family_id)
        .eq("subscription_type", "family")
        .maybeSingle(),
      supabase
        .from("family_members")
        .select("id, family_id, user_id, member_role, seat_kind, created_at")
        .eq("family_id", membership.family_id),
    ]);
    if (subRes.error) throw subRes.error;
    if (membersRes.error) throw membersRes.error;
    familySubscription = (subRes.data ?? null) as Subscription | null;
    familyMembers = (membersRes.data ?? []) as FamilyMemberRow[];
  }

  return buildEntitlements({
    userId,
    ownSubscription,
    familyId: membership?.family_id ?? null,
    familyRole: membership?.member_role ?? null,
    familySeatKind: membership?.seat_kind ?? null,
    familySubscription,
    familyMembers,
    prices,
  });
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
        source: entitlements.source,
      }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }
  return entitlements;
}

/**
 * Guard for billing actions. Children/teenagers can never start, change or pay
 * for a subscription — their access belongs to the family subscription.
 */
export async function requireBillingOwner(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Entitlements> {
  const entitlements = await loadEntitlements(supabase, userId);
  if (!entitlements.canSubscribe) {
    throw new Response(
      JSON.stringify({
        error: "billing_not_allowed",
        reason: "child_accounts_cannot_subscribe",
      }),
      { status: 403, headers: { "content-type": "application/json" } },
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
