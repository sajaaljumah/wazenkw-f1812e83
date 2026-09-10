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
  .inputValidator((data) =>
    z.object({ feature: z.enum(PREMIUM_FEATURES) }).parse(data),
  )
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
 * Upgrade entry point. Stripe checkout is not wired up yet: this returns a
 * `not_configured` result so the UI has its final shape. When Stripe is added,
 * create the Checkout Session here and return its URL — no UI changes needed.
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
    }): Promise<{ status: "not_configured" | "redirect"; url: string | null; message: string }> => {
      const { requireBillingOwner } = await import("@/lib/subscription.server");
      await requireBillingOwner(context.supabase, context.userId);
      return {
        status: "not_configured",
        url: null,
        message: `${data.kind} ${data.billingPeriod} checkout is not connected yet.`,
      };
    },
  );

/**
 * Billing management entry point (cancel / resume / update card). Will return a
 * Stripe Billing Portal URL once payments are connected.
 */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: "not_configured" | "redirect"; url: string | null; message: string }> => {
    const { requireBillingOwner } = await import("@/lib/subscription.server");
    await requireBillingOwner(context.supabase, context.userId);
    return {
      status: "not_configured",
      url: null,
      message: "Subscription management is not connected yet.",
    };
  });
