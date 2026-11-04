/**
 * Parent → child account management.
 *
 * Every call first proves, with the caller's own RLS-scoped client, that an
 * ACTIVE guardian link exists between the signed-in parent and the child.
 * Only then are privileged changes (login email, password, records) made with
 * the admin client. Demo accounts are view-only: the server refuses changes
 * when either the parent or the child is a demo account.
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
  transactions: ManagedChildTransaction[];
  goals: { id: string; name: string; kind: string; target_amount: number }[];
};

const childIdSchema = z.string().uuid();

async function requireGuardian(supabase: SupabaseClient, parentId: string, childId: string) {
  const { data, error } = await supabase
    .from("family_relationships")
    .select("child_user_id, permissions, status")
    .eq("parent_user_id", parentId)
    .eq("child_user_id", childId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) throw new Error("You can only manage children linked to your account.");
  const permissions = (data.permissions ?? {}) as Record<string, unknown>;
  return { canFund: permissions["can_fund"] === true };
}

async function childEmailOf(childId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(childId);
  return data.user?.email ?? null;
}

function parentEmailOf(claims: Record<string, unknown>): string | null {
  return typeof claims["email"] === "string" ? (claims["email"] as string) : null;
}

/** Refuses changes for demo accounts (presentation data must stay intact). */
async function assertEditable(claims: Record<string, unknown>, childId: string) {
  const childEmail = await childEmailOf(childId);
  if (isDemoAccount(parentEmailOf(claims)) || isDemoAccount(childEmail)) {
    throw new Error("DEMO_LOCKED");
  }
  return childEmail;
}

export const getManagedChildFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ childId: childIdSchema }).parse(data))
  .handler(async ({ data, context }): Promise<ManagedChild> => {
    const { supabase, userId, claims } = context;
    const { canFund } = await requireGuardian(supabase, userId, data.childId);

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
      childEmailOf(data.childId),
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
    const currentEmail = await assertEditable(claims as Record<string, unknown>, data.childId);
    if (isDemoAccount(data.email)) throw new Error("This email is reserved.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authChanges: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (data.email !== (currentEmail ?? "").toLowerCase()) {
      authChanges.email = data.email;
      authChanges.email_confirm = true;
    }
    if (data.password) authChanges.password = data.password;
    if (Object.keys(authChanges).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.childId, authChanges);
      if (error) {
        throw new Error(
          /already|registered|exists/i.test(error.message)
            ? "EMAIL_TAKEN"
            : "Could not update the child's login details.",
        );
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName, language: data.language })
      .eq("id", data.childId);
    if (profileError) throw new Error("Could not update the child's profile.");

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
    const { supabase, userId, claims } = context;
    await requireGuardian(supabase, userId, data.childId);
    await assertEditable(claims as Record<string, unknown>, data.childId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("base_currency")
      .eq("id", data.childId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("transactions").insert({
      user_id: data.childId,
      kind: data.kind,
      category: data.category,
      merchant: data.merchant || null,
      note: data.note || null,
      amount: data.amount,
      currency: profile?.base_currency ?? "KWD",
      occurred_on: data.occurredOn,
      paid_by_parent: false,
      deducted_from_child: false,
    });
    if (error) throw new Error("Could not save the transaction.");
    return { ok: true };
  });

export const deleteManagedChildTransactionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ childId: childIdSchema, transactionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId, claims } = context;
    await requireGuardian(supabase, userId, data.childId);
    await assertEditable(claims as Record<string, unknown>, data.childId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("id", data.transactionId)
      .eq("user_id", data.childId);
    if (error) throw new Error("Could not delete the transaction.");
    return { ok: true };
  });
