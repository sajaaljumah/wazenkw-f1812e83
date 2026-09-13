/**
 * Stripe Server Service for Wazen (Test Mode Only).
 *
 * Runs strictly on the server backend. Never imported into client bundles.
 * All requests to Stripe are made server-to-server.
 * Stripe credentials exist only in server environment variables.
 * Never exposes the Stripe secret key, credentials, or internal exceptions.
 */
import Stripe from "stripe";
import { getCollection, type SubscriptionDoc } from "@/lib/mongodb.server";

export type StripeError = {
  success: false;
  error: "NO_STRIPE_KEY" | "LIVE_MODE_FORBIDDEN" | "CONFIG_ERROR" | "STRIPE_ERROR";
  message: string;
};

export type CheckoutSessionOptions = {
  userId: string;
  userEmail?: string | null | undefined;
  kind: "individual" | "family";
  billingPeriod?: "monthly" | "yearly";
  additionalChildren?: number | undefined;
  familyId?: string | null | undefined;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
};

/**
 * Checks whether Stripe is configured in server environment.
 */
export function isStripeConfigured(): boolean {
  const key = process.env["STRIPE_SECRET_KEY"];
  return Boolean(key && key.trim().length > 0);
}

/**
 * Returns an initialized Stripe client for TEST MODE only.
 * Strictly verifies and refuses live mode keys to prevent charging real money.
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey || secretKey.trim() === "") {
    throw new Error("STRIPE_SECRET_KEY is not configured in the server environment.");
  }

  const trimmed = secretKey.trim();
  if (!trimmed.startsWith("sk_test_")) {
    throw new Error(
      "Security Constraint: Only Stripe TEST MODE (sk_test_*) is permitted. Refusing to operate in live mode.",
    );
  }

  return new Stripe(trimmed);
}

/**
 * Retrieves or creates a Stripe customer safely and idempotently.
 * Checks MongoDB and Supabase to reuse an existing Stripe Customer ID,
 * preventing duplicate customers for the same Wazen user.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  userEmail?: string | null,
): Promise<string> {
  const stripe = getStripeClient();

  // 1. Check MongoDB for existing customer ID
  try {
    const subCol = await getCollection("subscriptions");
    const mongoSub = await subCol.findOne({ user_id: userId });
    if (mongoSub?.stripe_customer_id) {
      try {
        const existing = await stripe.customers.retrieve(mongoSub.stripe_customer_id);
        if (!existing.deleted) {
          return existing.id;
        }
      } catch {
        // Customer not found in Stripe, will search or recreate
      }
    }
  } catch {
    // Continue if Mongo check fails
  }

  // 2. Check Supabase for existing customer ID
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: supaSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (supaSub?.stripe_customer_id) {
      try {
        const existing = await stripe.customers.retrieve(supaSub.stripe_customer_id);
        if (!existing.deleted) {
          return existing.id;
        }
      } catch {
        // Customer not found in Stripe
      }
    }
  } catch {
    // Continue if Supabase check fails
  }

  // 3. Search Stripe customers by metadata
  try {
    const search = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
    });
    const firstCust = search.data[0];
    if (firstCust && !firstCust.deleted) {
      return firstCust.id;
    }
  } catch {
    // If search is not enabled or index pending, continue
  }

  // 4. Create new customer with Wazen userId in metadata
  const createData: Stripe.CustomerCreateParams = {
    metadata: {
      userId,
      app: "Wazen",
    },
  };
  if (userEmail) {
    createData.email = userEmail;
  }
  const customer = await stripe.customers.create(createData);

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session in TEST mode for Wazen subscription.
 * Does NOT activate Premium access merely because Checkout was opened.
 */
export async function createCheckoutSession(
  options: CheckoutSessionOptions,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomer(options.userId, options.userEmail);

  // Validate Price IDs from environment variables
  const premiumPriceId = process.env["STRIPE_PREMIUM_PRICE_ID"];
  const familyPriceId = process.env["STRIPE_FAMILY_PRICE_ID"];
  const additionalChildPriceId = process.env["STRIPE_FAMILY_ADDITIONAL_CHILD_PRICE_ID"];

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (options.kind === "individual") {
    if (premiumPriceId && premiumPriceId.trim().length > 0) {
      lineItems.push({
        price: premiumPriceId.trim(),
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: "kwd",
          product_data: {
            name: "وازن بريميوم - اشتراك فردي (Wazen Premium Individual)",
            description: "وصول كامل لكافة الميزات والتحليلات المالية المتقدمة لحسابك الشخصي.",
          },
          unit_amount: 2500, // 2.500 KWD (KWD is 3 decimals)
          recurring: {
            interval: options.billingPeriod === "yearly" ? "year" : "month",
          },
        },
        quantity: 1,
      });
    }
  } else {
    // Family plan
    if (familyPriceId && familyPriceId.trim().length > 0) {
      lineItems.push({
        price: familyPriceId.trim(),
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: "kwd",
          product_data: {
            name: "وازن بريميوم - اشتراك عائلي (Wazen Premium Family)",
            description: "باقة عائلية متكاملة تشمل حسابين للوالدين وحتى 4 أطفال مع لوحة تحكم عائلية.",
          },
          unit_amount: 5000, // 5.000 KWD (KWD is 3 decimals)
          recurring: {
            interval: options.billingPeriod === "yearly" ? "year" : "month",
          },
        },
        quantity: 1,
      });
    }

    const extraChildren = options.additionalChildren ?? 0;
    if (extraChildren > 0) {
      if (additionalChildPriceId && additionalChildPriceId.trim().length > 0) {
        lineItems.push({
          price: additionalChildPriceId.trim(),
          quantity: extraChildren,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: "kwd",
            product_data: {
              name: "وازن - مقعد طفل إضافي (Wazen Extra Child Seat)",
            },
            unit_amount: 1000, // 1.000 KWD
            recurring: {
              interval: options.billingPeriod === "yearly" ? "year" : "month",
            },
          },
          quantity: extraChildren,
        });
      }
    }
  }

  let baseUrl = process.env["APP_URL"] || "https://wazenkw-f1812e83.onrender.com";
  if (baseUrl.includes("wazen.onrender.com") && !baseUrl.includes("wazenkw-f1812e83")) {
    baseUrl = "https://wazenkw-f1812e83.onrender.com";
  }
  const successUrl =
    options.successUrl || `${baseUrl}/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`;
  const cancelUrl = options.cancelUrl || `${baseUrl}/subscription?canceled=true`;

  const metadata = {
    userId: options.userId,
    kind: options.kind,
    billingPeriod: options.billingPeriod || "monthly",
    familyId: options.familyId || "",
    additionalChildren: String(options.additionalChildren || 0),
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    client_reference_id: options.userId,
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  // Store checkout session reference in MongoDB without granting Premium
  try {
    const subCol = await getCollection("subscriptions");
    await subCol.updateOne(
      { user_id: options.userId },
      {
        $set: {
          stripe_customer_id: customerId,
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        },
        $setOnInsert: {
          _id: options.userId,
          id: options.userId,
          user_id: options.userId,
          plan_id: "free",
          status: "active",
          billing_cycle: options.billingPeriod || "monthly",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // Non-blocking log
  }

  return session;
}

/**
 * Retrieves a Stripe Checkout Session by ID.
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });
}

/**
 * Retrieves a Stripe Subscription by ID.
 */
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancels a subscription through Stripe.
 * Prefers cancel_at_period_end so access remains valid until billing period ends.
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true,
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  let subscription: Stripe.Subscription;
  if (cancelAtPeriodEnd) {
    subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    subscription = await stripe.subscriptions.cancel(subscriptionId);
  }

  // Synchronize cancellation state to databases
  const sub = subscription as any;
  const userId = sub?.metadata?.["userId"];
  if (userId) {
    const now = new Date().toISOString();
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : now;

    // MongoDB
    try {
      const subCol = await getCollection("subscriptions");
      await subCol.updateOne(
        { user_id: userId },
        {
          $set: {
            cancel_at_period_end: cancelAtPeriodEnd,
            cancelled_at: now,
            current_period_end: periodEnd,
            status: cancelAtPeriodEnd ? "active" : "canceled",
            plan_id: cancelAtPeriodEnd
              ? sub.metadata?.["kind"] === "family"
                ? "family"
                : "individual"
              : "free",
            updated_at: now,
          },
        },
      );
    } catch {
      // Non-blocking
    }

    // Supabase
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("subscriptions")
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          cancelled_at: now,
          current_period_end: periodEnd,
          ...(cancelAtPeriodEnd ? {} : { plan: "free", status: "cancelled" }),
        })
        .eq("user_id", userId);
    } catch {
      // Non-blocking
    }
  }

  return subscription;
}

/**
 * Verifies and constructs a Stripe Webhook Event from raw payload and signature.
 * Uses constructEventAsync for compatibility with Web Crypto / Cloudflare Workers / modern edge runtimes.
 */
export async function constructWebhookEvent(
  rawPayload: string | Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!webhookSecret || webhookSecret.trim() === "") {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured in the server environment.");
  }

  return stripe.webhooks.constructEventAsync(rawPayload, signature, webhookSecret.trim());
}

/**
 * Synchronizes verified subscription state to both MongoDB Atlas and Supabase.
 * Enforces Wazen business rules:
 * - Immediate activation on payment
 * - Family members inherit Family Premium
 * - Children/teens never pay directly
 * - Clean return to Free on cancellation/expiry
 */
export async function syncSubscriptionState(params: {
  userId: string;
  plan: "free" | "individual" | "family";
  status: "active" | "canceled" | "past_due" | "trialing";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePriceId?: string | null;
  familyId?: string | null;
  additionalChildCount?: number;
  periodStart?: string;
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const now = new Date().toISOString();
  const isPremium = params.plan !== "free" && params.status === "active";
  const start = params.periodStart || now;
  const end = params.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Update MongoDB subscriptions collection (PRIMARY source of truth)
  try {
    const subCol = await getCollection("subscriptions");
    await subCol.updateOne(
      { $or: [{ user_id: params.userId }, { _id: params.userId as any }] },
      {
        $set: {
          plan_id: params.plan,
          plan: isPremium ? "premium" : "free",
          status: params.status,
          subscription_type: params.plan === "family" ? "family" : "individual",
          billing_cycle: "monthly",
          billing_period: "monthly",
          current_period_start: start,
          current_period_end: end,
          cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
          stripe_customer_id: params.stripeCustomerId || null,
          stripe_subscription_id: params.stripeSubscriptionId || null,
          stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
          stripe_price_id: params.stripePriceId || null,
          family_id: params.familyId || null,
          additional_child_count: params.additionalChildCount ?? 0,
          cancelled_at: params.status === "canceled" ? now : null,
          updated_at: now,
        },
        $setOnInsert: {
          _id: params.userId,
          id: params.userId,
          user_id: params.userId,
          created_at: now,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // Log without secrets
    console.error(
      "MongoDB subscription sync error:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // 2. Best-effort Supabase sync when SUPABASE_SERVICE_ROLE_KEY is present
  if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: params.userId,
          plan: isPremium ? "premium" : "free",
          status: params.status === "canceled" ? "cancelled" : params.status,
          subscription_type: params.plan === "family" ? "family" : "individual",
          family_id: params.familyId || null,
          billing_period: "monthly",
          stripe_customer_id: params.stripeCustomerId || null,
          stripe_subscription_id: params.stripeSubscriptionId || null,
          stripe_price_id: params.stripePriceId || null,
          included_parent_count: params.plan === "family" ? 2 : 1,
          included_child_count: params.plan === "family" ? 4 : 0,
          additional_child_count: params.additionalChildCount ?? 0,
          started_at: start,
          current_period_start: start,
          current_period_end: end,
          cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
          cancelled_at: params.status === "canceled" ? now : null,
        },
        { onConflict: "user_id" },
      );

      // If Family Plan, enable all family seats by clearing suspension
      if (params.plan === "family" && params.familyId) {
        await supabaseAdmin
          .from("family_members")
          .update({ seat_suspended: false })
          .eq("family_id", params.familyId);
      }
    } catch (err) {
      console.error(
        "Supabase subscription sync error:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

/**
 * Handles verified Stripe Webhook Events idempotently.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<{
  received: boolean;
  eventId: string;
  type: string;
  status: "processed" | "already_processed" | "ignored";
}> {
  // Idempotency: check if event was already processed
  try {
    const eventsCol = await getCollection("stripe_events");
    const existing = await eventsCol.findOne({ _id: event.id });
    if (existing) {
      return {
        received: true,
        eventId: event.id,
        type: event.type,
        status: "already_processed",
      };
    }
  } catch {
    // If check fails, continue processing
  }

  const stripe = getStripeClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.client_reference_id || session.metadata?.["userId"];
      if (!userId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || null;

      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id || null;

      const kind = session.metadata?.["kind"] === "family" ? "family" : "individual";
      const familyId = session.metadata?.["familyId"] || null;
      const additionalChildren = parseInt(session.metadata?.["additionalChildren"] || "0", 10) || 0;

      let periodStart = new Date().toISOString();
      let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      let priceId: string | null = null;

      if (subscriptionId) {
        try {
          const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
          if (sub.current_period_start) {
            periodStart = new Date(sub.current_period_start * 1000).toISOString();
          }
          if (sub.current_period_end) {
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          }
          priceId = sub.items?.data?.[0]?.price?.id || null;
        } catch {
          // Fallback to defaults
        }
      }

      await syncSubscriptionState({
        userId,
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
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as any;
      const userId = sub.metadata?.["userId"];
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;

      // Find user if not on subscription metadata
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        try {
          const subCol = await getCollection("subscriptions");
          const found = await subCol.findOne({
            $or: [{ stripe_subscription_id: sub.id }, { stripe_customer_id: customerId }],
          });
          if (found) resolvedUserId = found.user_id;
        } catch {
          // ignore
        }
      }

      if (!resolvedUserId) break;

      const kind = sub.metadata?.["kind"] === "family" ? "family" : "individual";
      const familyId = sub.metadata?.["familyId"] || null;
      const additionalChildren = parseInt(sub.metadata?.["additionalChildren"] || "0", 10) || 0;
      const priceId = sub.items?.data?.[0]?.price?.id || null;

      const isActive = sub.status === "active" || sub.status === "trialing";
      const isPastDue = sub.status === "past_due";
      const status = isActive ? "active" : isPastDue ? "past_due" : "canceled";
      const plan = isActive ? kind : "free";

      const periodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : new Date().toISOString();
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await syncSubscriptionState({
        userId: resolvedUserId,
        plan,
        status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        familyId,
        additionalChildCount: additionalChildren,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;

      let resolvedUserId = sub.metadata?.["userId"];
      if (!resolvedUserId) {
        try {
          const subCol = await getCollection("subscriptions");
          const found = await subCol.findOne({
            $or: [{ stripe_subscription_id: sub.id }, { stripe_customer_id: customerId }],
          });
          if (found) resolvedUserId = found.user_id;
        } catch {
          // ignore
        }
      }

      if (resolvedUserId) {
        await syncSubscriptionState({
          userId: resolvedUserId,
          plan: "free",
          status: "canceled",
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          cancelAtPeriodEnd: false,
        });
      }
      break;
    }

    default:
      // Other events are safely acknowledged
      break;
  }

  // Record event in MongoDB for idempotency
  try {
    const eventsCol = await getCollection("stripe_events");
    await eventsCol.insertOne({
      _id: event.id,
      id: event.id,
      type: event.type,
      processed_at: new Date().toISOString(),
      livemode: event.livemode,
    });
  } catch {
    // Non-blocking
  }

  return {
    received: true,
    eventId: event.id,
    type: event.type,
    status: "processed",
  };
}
