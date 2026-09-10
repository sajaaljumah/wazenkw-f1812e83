import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEntitlements,
  findPrice,
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
      .select("id, family_id, user_id, member_role, seat_kind, seat_suspended, created_at")
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
        .select("id, family_id, user_id, member_role, seat_kind, seat_suspended, created_at")
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

function addPeriod(from: Date, period: "monthly" | "yearly"): Date {
  const next = new Date(from);
  if (period === "yearly") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export type ActivationInput = {
  kind: "individual" | "family";
  billingPeriod: "monthly" | "yearly";
  additionalChildren: number;
};

/**
 * Activates premium for the caller. Plan state is stored with the user's
 * subscription row, so Premium/Free is always data-driven — never derived from
 * gender, demo identity or any other user attribute. When a payment provider is
 * connected later, it simply calls this after a successful payment.
 */
export async function activatePremium(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  input: ActivationInput,
): Promise<Entitlements> {
  const current = await requireBillingOwner(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const familyId = current.family?.familyId ?? null;
  const kind = input.kind === "family" && familyId ? "family" : "individual";
  const price = findPrice(current.prices, kind, input.billingPeriod);
  const now = new Date();
  const periodEnd = addPeriod(now, input.billingPeriod);

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "premium",
        status: "active",
        subscription_type: kind,
        family_id: kind === "family" ? familyId : null,
        billing_period: input.billingPeriod,
        price_key: price?.key ?? null,
        included_parent_count: kind === "family" ? (price?.included_parent_count ?? 2) : 1,
        included_child_count: kind === "family" ? (price?.included_child_count ?? 4) : 0,
        additional_child_count: kind === "family" ? Math.max(0, input.additionalChildren) : 0,
        started_at: current.startedAt ?? now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        cancelled_at: null,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;

  // Family seats inherit premium from the family subscription: clear any
  // per-seat suspension so every member of this family is entitled.
  if (kind === "family" && familyId) {
    const { error: seatError } = await supabaseAdmin
      .from("family_members")
      .update({ seat_suspended: false })
      .eq("family_id", familyId);
    if (seatError) throw seatError;
  }

  return loadEntitlements(supabase, userId);
}

/**
 * Cancels premium and returns the account to Free. Access is decided by the
 * stored subscription status, so cancelled or expired subscriptions are Free.
 */
export async function cancelPremium(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Entitlements> {
  await requireBillingOwner(supabase, userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "cancelled",
      cancelled_at: now,
      cancel_at_period_end: false,
      current_period_end: now,
    })
    .eq("user_id", userId);
  if (error) throw error;
  return loadEntitlements(supabase, userId);
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
