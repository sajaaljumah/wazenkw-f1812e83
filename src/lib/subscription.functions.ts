import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PREMIUM_FEATURES, type Entitlements, type PremiumFeature } from "@/lib/subscription";

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

/**
 * Upgrade entry point. Stripe checkout is not wired up yet: this returns a
 * `not_configured` result so the UI has its final shape. When Stripe is added,
 * create the Checkout Session here and return its URL — no UI changes needed.
 */
export const startPremiumUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ interval: z.enum(["month", "year"]).default("month") })
      .parse(data ?? {}),
  )
  .handler(
    async ({ data }): Promise<{ status: "not_configured" | "redirect"; url: string | null; message: string }> => {
      return {
        status: "not_configured",
        url: null,
        message: `Premium checkout (${data.interval}ly) is not connected yet.`,
      };
    },
  );

/**
 * Billing management entry point (cancel / resume / update card). Will return a
 * Stripe Billing Portal URL once payments are connected.
 */
export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ status: "not_configured" | "redirect"; url: string | null; message: string }> => {
    return {
      status: "not_configured",
      url: null,
      message: "Subscription management is not connected yet.",
    };
  });
