/**
 * Parent → child account management.
 *
 * Every call first proves, with the caller's own RLS-scoped client, that an
 * ACTIVE guardian link exists between the signed-in parent and the child.
 * Name, language and money records go through guardian-checked database
 * functions, so they also work on self-hosted copies without the private key.
 * Only login email/password changes need the admin client. Demo accounts are
 * view-only: both the server and the database refuse changes to them.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDemoAccount } from "@/lib/demo-accounts";

export type ManagedChildTransaction = {
  id: string;
  kind: string;
  category: string;
  merchant: string | null;
  amount: number;
  currency: string;
  occurred_on: string;
  note: string | null;
  paid_by_parent: boolean;
};

export type ManagedChild = {
  id: string;
  fullName: string;
  email: string | null;
  dateOfBirth: string;
  gender: string;
  lifeStage: string;
  language: string;
  currency: string;
  locked: boolean;
  canFund: boolean;
  relationship: string;
  transactions: ManagedChildTransaction[];
  goals: { id: string; name: string; kind: string; target_amount: number }[];
};

const childIdSchema = z.string().uuid();

async function requireGuardian(supabase: SupabaseClient, parentId: string, childId: string) {
  const { data, error } = await supabase
    .from("family_relationships")
    .select("child_user_id, permissions, status, relationship_type")
    .eq("parent_user_id", parentId)
    .eq("child_user_id", childId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Could not check the family link. Please try again.");
  if (!data) throw new Error("NOT_LINKED: You can only manage children linked to your account.");
  const permissions = (data.permissions ?? {}) as Record<string, unknown>;
  return { canFund: permissions["can_fund"] === true, relationship: data.relationship_type as string };
}

/** Child's login email via a guardian-checked database function (no private key needed). */
async function childEmailOf(supabase: SupabaseClient, childId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("wazen_managed_child_email", { _child: childId });
  if (error) {
    console.error("[child-management] could not read child login email", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

function parentEmailOf(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? (claims["email"] as string) : null;
}

function rpcError(message: string, fallback: string): Error {
  if (message.includes("DEMO_LOCKED")) return new Error("DEMO_LOCKED");
  if (message.includes("NOT_LINKED")) return new Error("NOT_LINKED");
  return new Error(fallback);
}

export const getManagedChildFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ childId: childIdSchema }).parse(data))
  .handler(async ({ data, context }): Promise<ManagedChild> => {
    const { supabase, userId, claims } = context;
    const { canFund, relationship } = await requireGuardian(supabase, userId, data.childId);

    const [profile, transactions, goals, email] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, date_of_birth, gender, life_stage, language, base_currency")
        .eq("id", data.childId)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("id, kind, category, merchant, amount, currency, occurred_on, note, paid_by_parent")
        .eq("user_id", data.childId)
        .order("occurred_on", { ascending: false })
        .limit(60),
      supabase.from("goals").select("id, name, kind, target_amount").eq("user_id", data.childId),
      childEmailOf(supabase, data.childId),
    ]);
    if (profile.error || !profile.data) throw new Error("Child profile not found.");

    const p = profile.data;
    return {
      id: p.id,
      fullName: p.full_name,
      email,
      dateOfBirth: p.date_of_birth,
      gender: p.gender,
      lifeStage: p.life_stage,
      language: p.language,
      currency: p.base_currency,
      locked:
        isDemoAccount(parentEmailOf(claims as Record<string, unknown>)) || isDemoAccount(email),
      canFund,
      relationship,
      transactions: ((transactions.data ?? []) as ManagedChildTransaction[]).map((row) => ({
        ...row,
        amount: Number(row.amount),
      })),
      goals: ((goals.data ?? []) as ManagedChild["goals"]).map((row) => ({
        ...row,
        target_amount: Number(row.target_amount),
      })),
    };
  });

export const updateManagedChildFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        childId: childIdSchema,
        fullName: z.string().trim().min(2).max(80),
        language: z.enum(["ar", "en"]),
        email: z.string().trim().toLowerCase().email().max(255),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId, claims } = context;
    await requireGuardian(supabase, userId, data.childId);
    if (isDemoAccount(parentEmailOf(claims as Record<string, unknown>))) throw new Error("DEMO_LOCKED");
    const currentEmail = await childEmailOf(supabase, data.childId);
    if (!currentEmail) throw new Error("Could not verify the child's account. Please try again.");
    if (isDemoAccount(currentEmail)) throw new Error("DEMO_LOCKED");
    if (isDemoAccount(data.email)) throw new Error("This email is reserved.");

    // Login email/password changes need the private server key (only on Lovable hosting).
    const authChanges: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (data.email !== currentEmail.toLowerCase()) {
      authChanges.email = data.email;
      authChanges.email_confirm = true;
    }
    if (data.password) authChanges.password = data.password;
    if (Object.keys(authChanges).length > 0) {
      if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) throw new Error("LOGIN_CHANGE_UNAVAILABLE");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.childId, authChanges);
      if (error) {
        throw new Error(
          /already|registered|exists/i.test(error.message)
            ? "EMAIL_TAKEN"
            : "Could not update the child's login details.",
        );
      }
    }

    const { error: profileError } = await supabase.rpc("wazen_update_managed_child", {
      _child: data.childId,
      _full_name: data.fullName,
      _language: data.language,
    });
    if (profileError) throw rpcError(profileError.message, "Could not update the child's profile.");

    return { ok: true };
  });

export const addManagedChildTransactionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        childId: childIdSchema,
        kind: z.enum(["expense", "income"]),
        category: z.string().trim().min(2).max(60),
        merchant: z.string().trim().max(80).nullable(),
        note: z.string().trim().max(200).nullable(),
        amount: z.number().positive().max(100000),
        occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await requireGuardian(supabase, userId, data.childId);
    const { error } = await supabase.rpc("wazen_add_managed_child_transaction", {
      _child: data.childId,
      _kind: data.kind,
      _category: data.category,
      _merchant: data.merchant ?? "",
      _note: data.note ?? "",
      _amount: data.amount,
      _occurred_on: data.occurredOn,
    });
    if (error) throw rpcError(error.message, "Could not save the transaction.");
    return { ok: true };
  });

export const deleteManagedChildTransactionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ childId: childIdSchema, transactionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await requireGuardian(supabase, userId, data.childId);
    const { error } = await supabase.rpc("wazen_delete_managed_child_transaction", {
      _child: data.childId,
      _transaction: data.transactionId,
    });
    if (error) throw rpcError(error.message, "Could not delete the transaction.");
    return { ok: true };
  });
