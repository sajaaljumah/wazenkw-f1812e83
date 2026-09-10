/**
 * Wazen subscription model (Stripe-ready, provider-agnostic).
 *
 * Two shapes exist:
 *  - Individual: one independent user (university student, employee, self-employed).
 *  - Family: 2 parents + up to 4 included children/teenagers, plus paid
 *    additional children beyond the included allowance.
 *
 * Children/teenagers never subscribe or pay: their access flows from the
 * family subscription. Entitlements are always computed on the server.
 */

export type SubscriptionPlan = "free" | "premium";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "past_due"
  | "trialing";

export type SubscriptionKind = "individual" | "family";
export type BillingPeriod = "monthly" | "yearly";
export type FamilySeatRole = "parent" | "child";
export type SeatKind = "included" | "additional";

export type Subscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  subscription_type: SubscriptionKind;
  family_id: string | null;
  billing_period: BillingPeriod;
  price_key: string | null;
  included_parent_count: number;
  included_child_count: number;
  additional_child_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  renewal_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyMemberRow = {
  id: string;
  family_id: string;
  user_id: string;
  member_role: FamilySeatRole;
  seat_kind: SeatKind;
  /** Data-driven, per-seat override: a suspended seat never inherits premium. */
  seat_suspended?: boolean | null;
  created_at: string;
};

/** Configurable pricing row (`public.subscription_prices`). */
export type PriceConfig = {
  key: string;
  subscription_type: SubscriptionKind;
  billing_period: BillingPeriod;
  amount: number;
  additional_child_amount: number;
  currency: string;
  included_parent_count: number;
  included_child_count: number;
  active: boolean;
};

/** Base family allowance, mirrored from the backend price configuration. */
export const FAMILY_INCLUDED_PARENTS = 2;
export const FAMILY_INCLUDED_CHILDREN = 4;

/** Fallback used only when the price table cannot be read (never for billing). */
export const FALLBACK_PRICES: PriceConfig[] = [
  {
    key: "individual_monthly",
    subscription_type: "individual",
    billing_period: "monthly",
    amount: 2.5,
    additional_child_amount: 0,
    currency: "KWD",
    included_parent_count: 1,
    included_child_count: 0,
    active: true,
  },
  {
    key: "family_monthly",
    subscription_type: "family",
    billing_period: "monthly",
    amount: 5,
    additional_child_amount: 1,
    currency: "KWD",
    included_parent_count: FAMILY_INCLUDED_PARENTS,
    included_child_count: FAMILY_INCLUDED_CHILDREN,
    active: true,
  },
];

export function findPrice(
  prices: PriceConfig[],
  kind: SubscriptionKind,
  period: BillingPeriod = "monthly",
): PriceConfig | null {
  return (
    prices.find(
      (p) => p.subscription_type === kind && p.billing_period === period && p.active,
    ) ??
    FALLBACK_PRICES.find(
      (p) => p.subscription_type === kind && p.billing_period === period,
    ) ??
    null
  );
}

/** Family base subscription + additional children fees. */
export function computeFamilyTotal(
  price: PriceConfig | null,
  additionalChildren: number,
): { base: number; additional: number; total: number; currency: string } {
  const base = price?.amount ?? 0;
  const perChild = price?.additional_child_amount ?? 0;
  const additional = Math.max(0, additionalChildren) * perChild;
  return {
    base,
    additional,
    total: base + additional,
    currency: price?.currency ?? "KWD",
  };
}

export function formatMoney(amount: number, currency = "KWD"): string {
  return `${amount.toFixed(3)} ${currency}`;
}

/** Feature keys guarded by the premium plan. Server-side checks use these too. */
export const PREMIUM_FEATURES = [
  "advanced_analytics",
  "ai_advisor",
  "investments",
  "zakat_planner",
  "unlimited_goals",
  "family_insights",
  "data_export",
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export const FEATURE_LABELS: Record<PremiumFeature, string> = {
  advanced_analytics: "Advanced analytics",
  ai_advisor: "AI financial advisor",
  investments: "Investments tracking",
  zakat_planner: "Zakat & Sadaqah planner",
  unlimited_goals: "Unlimited savings goals",
  family_insights: "Family insights & reports",
  data_export: "Export your data",
};

export const FEATURE_DESCRIPTIONS: Record<PremiumFeature, string> = {
  advanced_analytics: "Deeper trends, forecasts and category breakdowns.",
  ai_advisor: "Personalised guidance based on your own records.",
  investments: "Track portfolios, gold, silver and real estate.",
  zakat_planner: "Automatic zakat base and giving reminders.",
  unlimited_goals: "Go beyond the free plan's goal limit.",
  family_insights: "Richer summaries for the members you follow.",
  data_export: "Download statements and reports any time.",
};

/** Free-plan quotas. Enforce these server-side when the modules are built. */
export const FREE_PLAN_LIMITS = {
  goals: 3,
  budgets: 1,
  recurring_items: 5,
} as const;

export type PlanLimit = keyof typeof FREE_PLAN_LIMITS;

export type FamilySeat = {
  userId: string;
  role: FamilySeatRole;
  seatKind: SeatKind;
  entitled: boolean;
};

export type FamilyPlanSummary = {
  familyId: string;
  ownerUserId: string | null;
  includedParentCount: number;
  includedChildCount: number;
  additionalChildCount: number;
  parentCount: number;
  childCount: number;
  entitledChildCount: number;
  remainingIncludedChildSeats: number;
  seats: FamilySeat[];
};

export type EntitlementSource = "none" | "individual" | "family";

export type Entitlements = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPremium: boolean;
  /** Premium that is ending at period end, still usable until then. */
  isCancelling: boolean;
  needsAttention: boolean;
  features: PremiumFeature[];
  limits: Record<PlanLimit, number | null>;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  renewalAt: string | null;
  trialEndsAt: string | null;
  /** Where premium comes from. */
  source: EntitlementSource;
  subscriptionKind: SubscriptionKind | null;
  billingPeriod: BillingPeriod | null;
  /** Seat role inside a family subscription, if any. */
  seatRole: FamilySeatRole | null;
  seatKind: SeatKind | null;
  /** True when this user owns the subscription record. */
  isOwner: boolean;
  /** Children/teenagers can never buy or manage a subscription. */
  canSubscribe: boolean;
  canManageBilling: boolean;
  family: FamilyPlanSummary | null;
  prices: PriceConfig[];
};

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  status: "active",
  isPremium: false,
  isCancelling: false,
  needsAttention: false,
  features: [],
  limits: { ...FREE_PLAN_LIMITS },
  startedAt: null,
  currentPeriodEnd: null,
  renewalAt: null,
  trialEndsAt: null,
  source: "none",
  subscriptionKind: null,
  billingPeriod: null,
  seatRole: null,
  seatKind: null,
  isOwner: false,
  canSubscribe: true,
  canManageBilling: false,
  family: null,
  prices: FALLBACK_PRICES,
};

/** Single source of truth for "is this subscription currently premium?". */
export function isPremiumActive(sub: Subscription | null | undefined): boolean {
  if (!sub || sub.plan !== "premium") return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.current_period_end && new Date(sub.current_period_end) <= new Date()) return false;
  return true;
}

/**
 * Which family seats the subscription actually pays for: every included parent,
 * every included child, and additional children up to `additional_child_count`.
 * Mirrors `private.is_family_seat_entitled` in the database.
 */
export function resolveFamilySeats(
  members: FamilyMemberRow[],
  sub: Subscription | null,
): FamilySeat[] {
  const premium = isPremiumActive(sub);
  const includedParents = sub?.included_parent_count ?? FAMILY_INCLUDED_PARENTS;
  const paidAdditional = sub?.additional_child_count ?? 0;
  const byDate = [...members].sort((a, b) => a.created_at.localeCompare(b.created_at));

  let parentIndex = 0;
  let additionalIndex = 0;

  return byDate.map((m) => {
    let entitled = false;
    const suspended = m.seat_suspended === true;
    if (m.member_role === "parent") {
      parentIndex += 1;
      entitled = premium && parentIndex <= includedParents;
    } else if (m.seat_kind === "included") {
      entitled = premium;
    } else {
      additionalIndex += 1;
      entitled = premium && additionalIndex <= paidAdditional;
    }
    return { userId: m.user_id, role: m.member_role, seatKind: m.seat_kind, entitled: entitled && !suspended };
  });
}

export function summariseFamily(
  familyId: string,
  members: FamilyMemberRow[],
  sub: Subscription | null,
): FamilyPlanSummary {
  const seats = resolveFamilySeats(members, sub);
  const parents = seats.filter((s) => s.role === "parent");
  const children = seats.filter((s) => s.role === "child");
  const includedChildCount = sub?.included_child_count ?? FAMILY_INCLUDED_CHILDREN;
  const includedChildrenUsed = children.filter((c) => c.seatKind === "included").length;
  return {
    familyId,
    ownerUserId: sub?.user_id ?? null,
    includedParentCount: sub?.included_parent_count ?? FAMILY_INCLUDED_PARENTS,
    includedChildCount,
    additionalChildCount: sub?.additional_child_count ?? 0,
    parentCount: parents.length,
    childCount: children.length,
    entitledChildCount: children.filter((c) => c.entitled).length,
    remainingIncludedChildSeats: Math.max(0, includedChildCount - includedChildrenUsed),
    seats,
  };
}

type BuildInput = {
  userId: string;
  ownSubscription: Subscription | null;
  familyId: string | null;
  familyRole: FamilySeatRole | null;
  familySeatKind: SeatKind | null;
  familySubscription: Subscription | null;
  familyMembers: FamilyMemberRow[];
  prices: PriceConfig[];
};

/**
 * Combines an individual subscription and any family subscription into one
 * authoritative entitlement view.
 */
export function buildEntitlements(input: BuildInput): Entitlements {
  const family =
    input.familyId !== null
      ? summariseFamily(input.familyId, input.familyMembers, input.familySubscription)
      : null;

  const seat = family?.seats.find((s) => s.userId === input.userId) ?? null;
  const ownPremium = isPremiumActive(input.ownSubscription);
  const familyPremium = !!seat?.entitled;
  const premium = ownPremium || familyPremium;

  const active: Subscription | null = ownPremium
    ? input.ownSubscription
    : familyPremium
      ? input.familySubscription
      : (input.familySubscription ?? input.ownSubscription);

  const source: EntitlementSource = ownPremium
    ? "individual"
    : familyPremium
      ? "family"
      : input.familyId
        ? "family"
        : "none";

  const isChild = input.familyRole === "child";
  const isOwner = !!active && active.user_id === input.userId;

  return {
    plan: active?.plan ?? "free",
    status: active?.status ?? "active",
    isPremium: premium,
    isCancelling: premium && !!active?.cancel_at_period_end,
    needsAttention: active?.status === "past_due",
    features: premium ? [...PREMIUM_FEATURES] : [],
    limits: premium
      ? { goals: null, budgets: null, recurring_items: null }
      : { ...FREE_PLAN_LIMITS },
    startedAt: active?.started_at ?? null,
    currentPeriodEnd: active?.current_period_end ?? null,
    renewalAt: active?.renewal_at ?? active?.current_period_end ?? null,
    trialEndsAt: active?.trial_ends_at ?? null,
    source,
    subscriptionKind: active?.subscription_type ?? (input.familyId ? "family" : null),
    billingPeriod: active?.billing_period ?? null,
    seatRole: input.familyRole,
    seatKind: input.familySeatKind,
    isOwner,
    // children/teenagers never subscribe or pay independently
    canSubscribe: !isChild,
    canManageBilling: !isChild && (isOwner || input.familyRole === "parent"),
    family,
    prices: input.prices.length ? input.prices : FALLBACK_PRICES,
  };
}

export function hasFeature(entitlements: Entitlements, feature: PremiumFeature): boolean {
  return entitlements.features.includes(feature);
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  cancelled: "Cancelled",
  past_due: "Payment past due",
  trialing: "Trial",
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: "Free",
  premium: "Premium",
};

export const KIND_LABELS: Record<SubscriptionKind, string> = {
  individual: "Individual subscription",
  family: "Family subscription",
};

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "month",
  yearly: "year",
};

export const FREE_PLAN_HIGHLIGHTS = [
  "Dashboard with your real income and expenses",
  "Monthly budget and spending overview",
  `Up to ${FREE_PLAN_LIMITS.goals} savings goals`,
  "Family linking and permissions",
];

export const FAMILY_PLAN_HIGHLIGHTS = [
  "Two parents share one subscription",
  `Up to ${FAMILY_INCLUDED_CHILDREN} children or teenagers included`,
  "Extra children can be added for a small per-child fee",
  "Every premium feature for each entitled member",
];

export const INDIVIDUAL_PLAN_HIGHLIGHTS = [
  "For university students, employees and self-employed users",
  "Covers one account only",
  "Every premium feature for you",
];

export function formatPlanDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
