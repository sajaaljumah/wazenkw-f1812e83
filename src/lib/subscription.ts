/**
 * Wazen subscription model (Stripe-ready).
 *
 * This module is intentionally provider-agnostic: the plan/status shape mirrors
 * what Stripe reports, so wiring real checkout + webhooks later only means
 * writing to `public.subscriptions` — no application restructuring.
 */

export type SubscriptionPlan = "free" | "premium";
export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "cancelled"
  | "past_due"
  | "trialing";

export type Subscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

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
  trialEndsAt: string | null;
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
  trialEndsAt: null,
};

/** Single source of truth for "is this subscription currently premium?". */
export function isPremiumActive(sub: Subscription | null | undefined): boolean {
  if (!sub || sub.plan !== "premium") return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.current_period_end && new Date(sub.current_period_end) <= new Date()) return false;
  return true;
}

export function entitlementsFor(sub: Subscription | null | undefined): Entitlements {
  const premium = isPremiumActive(sub);
  return {
    plan: sub?.plan ?? "free",
    status: sub?.status ?? "active",
    isPremium: premium,
    isCancelling: premium && !!sub?.cancel_at_period_end,
    needsAttention: sub?.status === "past_due",
    features: premium ? [...PREMIUM_FEATURES] : [],
    limits: premium
      ? { goals: null, budgets: null, recurring_items: null }
      : { ...FREE_PLAN_LIMITS },
    startedAt: sub?.started_at ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    trialEndsAt: sub?.trial_ends_at ?? null,
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

/** Placeholder pricing until Stripe prices are created. */
export const PREMIUM_PRICE = { amount: 2.5, currency: "KWD", interval: "month" } as const;

export const FREE_PLAN_HIGHLIGHTS = [
  "Dashboard with your real income and expenses",
  "Monthly budget and spending overview",
  `Up to ${FREE_PLAN_LIMITS.goals} savings goals`,
  "Family linking and permissions",
];

export function formatPlanDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
