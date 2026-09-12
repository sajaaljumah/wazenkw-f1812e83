import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PREMIUM_FEATURES,
  computeFamilyTotal,
  findPrice,
  type Entitlements,
  type PremiumFeature,
} from "@/lib/subscription";

/** Authoritative entitlements for the signed-in user, computed on the server. */
export const getMyEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Entitlements> => {
    const { loadEntitlements } = await import("@/lib/subscription.server");
    return loadEntitlements(context.supabase, context.userId);
  });

/** Server-verified single-feature check, for UI that must not guess. */
export const checkFeatureAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ feature: z.enum(PREMIUM_FEATURES) }).parse(data))
  .handler(async ({ context, data }): Promise<{ allowed: boolean; feature: PremiumFeature }> => {
    const { loadEntitlements } = await import("@/lib/subscription.server");
    const entitlements = await loadEntitlements(context.supabase, context.userId);
    return {
      allowed: entitlements.features.includes(data.feature),
      feature: data.feature,
    };
  });

export type SubscriptionQuote = {
  kind: "individual" | "family";
  billingPeriod: "monthly" | "yearly";
  currency: string;
  base: number;
  additionalChildren: number;
  additionalChildAmount: number;
  additional: number;
  total: number;
  includedParentCount: number;
  includedChildCount: number;
};

/**
 * Price quote computed on the server from the configurable price table:
 * family base subscription + additional children fees.
 */
export const getSubscriptionQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["individual", "family"]).default("family"),
        billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
        children: z.number().int().min(0).max(20).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<SubscriptionQuote> => {
    const { loadEntitlements } = await import("@/lib/subscription.server");
    const entitlements = await loadEntitlements(context.supabase, context.userId);
    const price = findPrice(entitlements.prices, data.kind, data.billingPeriod);
    const includedChildren = price?.included_child_count ?? 0;
    const totalChildren = data.children ?? entitlements.family?.childCount ?? 0;
    const additionalChildren =
      data.kind === "family" ? Math.max(0, totalChildren - includedChildren) : 0;
    const money = computeFamilyTotal(price, additionalChildren);
    return {
      kind: data.kind,
      billingPeriod: data.billingPeriod,
      currency: money.currency,
      base: money.base,
      additionalChildren,
      additionalChildAmount: price?.additional_child_amount ?? 0,
      additional: money.additional,
      total: money.total,
      includedParentCount: price?.included_parent_count ?? 1,
      includedChildCount: includedChildren,
    };
  });

/**
 * Server-side TanStack Start function for Stripe Test Mode Checkout Session creation.
 * Rejects child/teen accounts server-side.
 * Does NOT mark a user Premium merely because Checkout was opened.
 */
export const createCheckoutSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["individual", "family"]).default("individual"),
        billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
        additionalChildren: z.number().int().min(0).max(20).default(0),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{
      sessionId: string;
      url: string | null;
    }> => {
      const { requireBillingOwner } = await import("@/lib/subscription.server");
      const current = await requireBillingOwner(context.supabase, context.userId);
      const { createCheckoutSession } = await import("@/lib/stripe.server");

      const session = await createCheckoutSession({
        userId: context.userId,
        userEmail:
          "userEmail" in context &&
          typeof (context as { userEmail?: unknown }).userEmail === "string"
            ? (context as { userEmail: string }).userEmail
            : null,
        kind: data.kind,
        billingPeriod: data.billingPeriod,
        additionalChildren: data.additionalChildren,
        familyId: current.family?.familyId ?? null,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    },
  );

/**
 * Upgrade entry point. Payment processing is not connected yet, so activating a
 * premium plan writes the subscription state directly (Free → Premium) and the
 * UI reads it back from the server. When Stripe is added, create the Checkout
 * Session here and call `activatePremium` from the webhook instead.
 * Child/teenager accounts are rejected server-side.
 */
export const startPremiumUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["individual", "family"]).default("individual"),
        billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
        additionalChildren: z.number().int().min(0).max(20).default(0),
      })
      .parse(data ?? {}),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{
      status: "activated" | "redirect";
      url: string | null;
      entitlements: Entitlements | null;
    }> => {
      const { activatePremium } = await import("@/lib/subscription.server");
      const entitlements = await activatePremium(context.supabase, context.userId, {
        kind: data.kind,
        billingPeriod: data.billingPeriod,
        additionalChildren: data.additionalChildren,
      });
      return { status: "activated", url: null, entitlements };
    },
  );

/** Cancels premium immediately; the account returns to Free by stored status. */
export const cancelPremiumSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: "cancelled"; entitlements: Entitlements }> => {
    // If active Stripe subscription exists, cancel via Stripe
    try {
      const { getCollection } = await import("@/lib/mongodb.server");
      const subCol = await getCollection("subscriptions");
      const mongoSub = await subCol.findOne({ user_id: context.userId });
      if (mongoSub?.stripe_subscription_id) {
        const { cancelSubscription } = await import("@/lib/stripe.server");
        await cancelSubscription(mongoSub.stripe_subscription_id, true);
        const { loadEntitlements } = await import("@/lib/subscription.server");
        const updated = await loadEntitlements(context.supabase, context.userId);
        return { status: "cancelled", entitlements: updated };
      }
    } catch {
      // Fallback to direct cancellation
    }

    const { cancelPremium } = await import("@/lib/subscription.server");
    const entitlements = await cancelPremium(context.supabase, context.userId);
    return { status: "cancelled", entitlements };
  });

/**
 * Billing management entry point (cancel / resume / update card). Will return a
 * Stripe Billing Portal URL once payments are connected.
 */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ status: "not_configured" | "redirect"; url: string | null; message: string }> => {
      const { requireBillingOwner } = await import("@/lib/subscription.server");
      await requireBillingOwner(context.supabase, context.userId);
      return {
        status: "not_configured",
        url: null,
        message: "Subscription management is not connected yet.",
      };
    },
  );

/**
 * Verifies a completed Stripe Checkout Session upon client redirect.
 * Immediately activates Premium entitlements for the authenticated user and syncs MongoDB Atlas & Supabase.
 */
export const verifyCheckoutSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        sessionId: z.string().min(1),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    plan?: "individual" | "family";
    entitlements?: Entitlements;
  }> => {
    const { retrieveCheckoutSession, syncSubscriptionState, getStripeClient } = await import(
      "@/lib/stripe.server"
    );
    const { loadEntitlements } = await import("@/lib/subscription.server");

    const session = await retrieveCheckoutSession(data.sessionId);

    // Verify ownership
    const sessionUserId = session.client_reference_id || session.metadata?.userId;
    if (sessionUserId && sessionUserId !== context.userId) {
      throw new Error("Unauthorized session verification.");
    }

    const isPaid = session.payment_status === "paid" || session.status === "complete";
    if (!isPaid) {
      return { success: false };
    }

    const kind = session.metadata?.kind === "family" ? "family" : "individual";
    const familyId = session.metadata?.familyId || null;
    const additionalChildren = parseInt(session.metadata?.additionalChildren || "0", 10) || 0;
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;

    let periodStart = new Date().toISOString();
    let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let priceId: string | null = null;

    if (subscriptionId) {
      try {
        const stripe = getStripeClient();
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.current_period_start) {
          periodStart = new Date(sub.current_period_start * 1000).toISOString();
        }
        if (sub.current_period_end) {
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
        priceId = sub.items?.data?.[0]?.price?.id || null;
      } catch (err) {
        console.warn("Could not retrieve subscription details from Stripe:", err);
      }
    }

    await syncSubscriptionState({
      userId: context.userId,
      plan: kind,
      status: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: session.id,
      stripePriceId: priceId,
      familyId,
      additionalChildCount: additionalChildren,
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: false,
    });

    // Update Supabase Auth user_metadata directly for guaranteed permanence
    try {
      await context.supabase.auth.updateUser({
        data: {
          subscription: {
            plan: "premium",
            plan_id: kind,
            subscription_type: kind,
            status: "active",
            family_id: familyId,
            billing_period: "monthly",
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (metaErr) {
      console.warn("Supabase user_metadata sync notice:", metaErr);
    }

    const entitlements = await loadEntitlements(context.supabase, context.userId);
    return {
      success: true,
      plan: kind,
      entitlements,
    };
  });

