import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDemoAccount } from "@/lib/demo-accounts";
import { calculateAge } from "@/lib/wazen";

/**
 * Permanently deletes a user's account and all associated records.
 * STRICT SECURITY CONSTRAINTS:
 * 1. Demo accounts (e.g. mariam@wazen.app, saja@wazen.app, etc.) CANNOT be deleted.
 * 2. Minors (< 18 years old) cannot delete accounts independently.
 */
export const deleteMyAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ success: boolean; message?: string }> => {
    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Unauthorized user.");
    }

    const email = userData.user.email;
    if (isDemoAccount(email)) {
      throw new Response(
        JSON.stringify({
          error: "demo_account_protected",
          message: "الحسابات التجريبية محمية ولا يمكن حذفها للحفاظ على بيانات العرض.",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }

    // Check age/life stage to protect minors
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("date_of_birth, life_stage")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile?.date_of_birth && calculateAge(profile.date_of_birth) < 18) {
      throw new Response(
        JSON.stringify({
          error: "minor_account_protected",
          message: "لا يمكن للأطفال أو المراهقين حذف الحساب — يتم التحكم بالحساب عبر ولي الأمر.",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }

    // 1. Delete from MongoDB Atlas
    try {
      const { getDatabase } = await import("@/lib/mongodb.server");
      const db = await getDatabase();
      await Promise.allSettled([
        db.collection("subscriptions").deleteOne({
          $or: [{ user_id: context.userId }, { _id: context.userId }],
        }),
        db.collection("documents").deleteMany({ user_id: context.userId }),
      ]);
    } catch (err) {
      console.warn("MongoDB deletion error:", err);
    }

    // 2. Delete all records from Supabase tables
    try {
      await Promise.allSettled([
        context.supabase.from("documents").delete().eq("user_id", context.userId),
        context.supabase.from("transactions").delete().eq("user_id", context.userId),
        context.supabase.from("goals").delete().eq("user_id", context.userId),
        context.supabase.from("budgets").delete().eq("user_id", context.userId),
        context.supabase.from("recurring_items").delete().eq("user_id", context.userId),
        context.supabase.from("zakat_payments").delete().eq("user_id", context.userId),
        context.supabase.from("zakat_calculations").delete().eq("user_id", context.userId),
        context.supabase.from("assets").delete().eq("user_id", context.userId),
        context.supabase.from("family_members").delete().eq("user_id", context.userId),
        context.supabase.from("subscriptions").delete().eq("user_id", context.userId),
        context.supabase.from("profiles").delete().eq("id", context.userId),
      ]);
    } catch (err) {
      console.warn("Supabase record deletion error:", err);
    }

    // 3. Delete from Supabase Auth if admin key is present
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.auth.admin.deleteUser(context.userId);
      } catch (err) {
        console.warn("Supabase admin auth delete error:", err);
      }
    }

    return { success: true };
  });
