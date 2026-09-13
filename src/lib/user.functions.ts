import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDemoAccount } from "@/lib/demo-accounts";
import { calculateAge, firstNameOf } from "@/lib/wazen";

/**
 * Permanently purges a specific user by email from Supabase Auth and all database tables.
 * Used for administrative cleanup of erroneously created test accounts.
 */
export async function purgeUserByEmail(targetEmail: string) {
  if (!targetEmail || isDemoAccount(targetEmail)) {
    return { success: false, message: "Cannot purge demo accounts" };
  }
  const cleanEmail = targetEmail.trim().toLowerCase();

  // 1. Attempt RPC purge_deleted_user_by_email
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://pdgdqlqjwvwbgrgziuvt.supabase.co";
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wsia1nTheJe6eXdXmxSFkw_VTt1FP_j";
    const authClient = createClient(supabaseUrl, supabaseKey);
    await (authClient.rpc as any)("purge_deleted_user_by_email", { target_email: cleanEmail });
  } catch (rpcErr) {
    console.warn("[Auto-Purge] RPC purge notice:", rpcErr);
  }

  // 2. If Supabase admin client is available
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && usersData?.users) {
        const found = usersData.users.find(
          (u) => u.email?.toLowerCase() === cleanEmail,
        );
        if (found) {
          const userId = found.id;
          await Promise.allSettled([
            supabaseAdmin.from("documents").delete().eq("user_id", userId),
            supabaseAdmin.from("transactions").delete().eq("user_id", userId),
            supabaseAdmin.from("goals").delete().eq("user_id", userId),
            supabaseAdmin.from("budgets").delete().eq("user_id", userId),
            supabaseAdmin.from("recurring_items").delete().eq("user_id", userId),
            supabaseAdmin.from("zakat_payments").delete().eq("user_id", userId),
            supabaseAdmin.from("zakat_calculations").delete().eq("user_id", userId),
            supabaseAdmin.from("assets").delete().eq("user_id", userId),
            supabaseAdmin.from("family_relationships").delete().or(`child_user_id.eq.${userId},parent_user_id.eq.${userId}`),
            supabaseAdmin.from("family_members").delete().eq("user_id", userId),
            supabaseAdmin.from("subscriptions").delete().eq("user_id", userId),
            supabaseAdmin.from("profiles").delete().eq("id", userId),
          ]);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log(`[Auto-Purge] Deleted user ${userId} (${cleanEmail}) from Supabase Auth & DB.`);
        }
      }
    } catch (adminErr) {
      console.warn("[Auto-Purge] Supabase admin error:", adminErr);
    }
  }

  // 3. Also wipe from MongoDB
  try {
    const { getDatabase, isMongoConfigured } = await import("@/lib/mongodb.server");
    if (isMongoConfigured()) {
      const db = await getDatabase();
      const profile = await db.collection("profiles").findOne({ email: cleanEmail });
      const userId = (profile?.user_id || profile?._id) as string | undefined;
      if (userId) {
        await Promise.allSettled([
          db.collection("profiles").deleteOne({ _id: userId }),
          db.collection("subscriptions").deleteOne({ $or: [{ user_id: userId }, { _id: userId }] }),
          db.collection("documents").deleteMany({ user_id: userId }),
          db.collection("transactions").deleteMany({ user_id: userId }),
          db.collection("family_relationships").deleteMany({ $or: [{ child_user_id: userId }, { parent_user_id: userId }] }),
        ]);
      }
      await db.collection("deleted_accounts").deleteMany({ email: cleanEmail });
    }
  } catch (mongoErr) {
    console.warn("[Auto-Purge] MongoDB error:", mongoErr);
  }

  DELETED_EMAILS_SET.delete(cleanEmail);
  return { success: true };
}

// Known deleted accounts cache (persists across server function calls in memory)
const DELETED_EMAILS_SET = new Set<string>();

const DELETED_USER_IDS_SET = new Set<string>([
  "d03b6caf-3271-4cee-9b11-56e2d9337b6c",
]);

/**
 * Checks whether an account session has been permanently deleted in MongoDB or registry.
 * Primarily validates by userId to avoid banning future new accounts created with the same email.
 */
export async function isAccountDeleted(
  email?: string | null,
  userId?: string | null,
): Promise<{ isDeleted: boolean; reason?: string }> {
  const cleanEmail = email?.trim().toLowerCase();
  const cleanId = userId?.trim();

  // 1. Check in-memory sets & blocked system dummy patterns
  if (cleanEmail) {
    if (
      cleanEmail.includes("deleted.wazen") ||
      cleanEmail.startsWith("deleted-")
    ) {
      return { isDeleted: true, reason: "Account marked deleted in registry" };
    }
  }

  if (cleanId && DELETED_USER_IDS_SET.has(cleanId)) {
    return { isDeleted: true, reason: "User ID marked deleted in registry" };
  }

  // 2. Check MongoDB deleted_accounts collection by userId
  try {
    const { getDatabase, isMongoConfigured } = await import("@/lib/mongodb.server");
    if (isMongoConfigured()) {
      const db = await getDatabase();
      if (cleanId) {
        const found = await db.collection("deleted_accounts").findOne({
          $or: [{ user_id: cleanId }, { _id: cleanId }],
        });
        if (found) {
          DELETED_USER_IDS_SET.add(cleanId);
          return { isDeleted: true, reason: "Account found in MongoDB deleted_accounts" };
        }
      }
    }
  } catch (mongoErr) {
    console.warn("[isAccountDeleted] MongoDB check warning:", mongoErr);
  }

  return { isDeleted: false };
}

/**
 * Prepares an email for a fresh sign-up by clearing any stale deleted account markers
 * or purged auth records, allowing the user to create a brand new account cleanly.
 */
export const prepareEmailForSignUpFn = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const cleanEmail = data.email?.trim().toLowerCase();
    if (!cleanEmail || isDemoAccount(cleanEmail)) {
      return { success: false };
    }

    // 1. Remove from in-memory deleted set
    DELETED_EMAILS_SET.delete(cleanEmail);

    // 2. Clear from MongoDB deleted_accounts
    try {
      const { getDatabase, isMongoConfigured } = await import("@/lib/mongodb.server");
      if (isMongoConfigured()) {
        const db = await getDatabase();
        await db.collection("deleted_accounts").deleteMany({ email: cleanEmail });
      }
    } catch {}

    // 3. Purge marked-deleted account in Supabase Auth if any
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://pdgdqlqjwvwbgrgziuvt.supabase.co";
      const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wsia1nTheJe6eXdXmxSFkw_VTt1FP_j";
      const client = createClient(supabaseUrl, supabaseKey);
      await (client.rpc as any)("purge_deleted_user_by_email", { target_email: cleanEmail });
    } catch {}

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = usersData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing && (existing.user_metadata?.is_deleted || existing.user_metadata?.account_status === "deleted")) {
          await supabaseAdmin.from("profiles").delete().eq("id", existing.id);
          await supabaseAdmin.auth.admin.deleteUser(existing.id);
        }
      } catch {}
    }

    return { success: true };
  });

/**
 * Server function to check if an account is permanently deleted.
 */
export const checkAccountDeletedFn = createServerFn({ method: "POST" })
  .validator((input: { email?: string; userId?: string }) => input)
  .handler(async ({ data }) => {
    return await isAccountDeleted(data.email, data.userId);
  });

/**
 * Server function to trigger user purge explicitly.
 */
export const purgeTargetUserFn = createServerFn({ method: "POST" })
  .validator((email: string) => email)
  .handler(async ({ data: targetEmail }) => {
    return await purgeUserByEmail(targetEmail);
  });

/**
 * Permanently deletes the authenticated user's account and all associated records.
 * STRICT SECURITY CONSTRAINTS:
 * 1. Demo accounts (e.g. mariam@wazen.app, saja@wazen.app, etc.) CANNOT be deleted.
 * 2. Minors (< 18 years old) who have a linked guardian cannot delete without their guardian.
 *    HOWEVER, unlinked/orphaned minor accounts or test accounts CAN delete themselves.
 */
export const deleteMyAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ success: boolean; message?: string }> => {
    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Unauthorized user.");
    }

    const email = userData.user.email?.toLowerCase();
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

    // Check if the minor user is linked to an active guardian
    const { data: relationships } = await context.supabase
      .from("family_relationships")
      .select("id, parent_user_id")
      .eq("child_user_id", context.userId)
      .eq("status", "active")
      .limit(1);

    const isMinor = Boolean(profile?.date_of_birth && calculateAge(profile.date_of_birth) < 18);
    const hasGuardian = Boolean(relationships && relationships.length > 0);

    // If it's a minor who HAS an active guardian, guardian control is required.
    // Unlinked/orphaned accounts are allowed to delete.
    if (isMinor && hasGuardian) {
      throw new Response(
        JSON.stringify({
          error: "minor_account_protected",
          message: "لا يمكن للأطفال أو المراهقين حذف الحساب — يتم التحكم بالحساب عبر ولي الأمر.",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }

    // Add deleted user ID to in-memory blacklist immediately
    if (context.userId) DELETED_USER_IDS_SET.add(context.userId);

    // 1. Delete and record in MongoDB Atlas
    try {
      const { getDatabase, isMongoConfigured } = await import("@/lib/mongodb.server");
      if (isMongoConfigured()) {
        const db = await getDatabase();
        await Promise.allSettled([
          db.collection("deleted_accounts").updateOne(
            { user_id: context.userId },
            {
              $set: {
                user_id: context.userId,
                email: email,
                deleted_at: new Date().toISOString(),
                account_status: "deleted",
              },
            },
            { upsert: true },
          ),
          db.collection("subscriptions").deleteOne({
            $or: [{ user_id: context.userId }, { _id: context.userId }],
          }),
          db.collection("documents").deleteMany({ user_id: context.userId }),
          db.collection("transactions").deleteMany({ user_id: context.userId }),
          db.collection("profiles").deleteOne({ _id: context.userId }),
          db.collection("family_relationships").deleteMany({
            $or: [{ child_user_id: context.userId }, { parent_user_id: context.userId }],
          }),
        ]);
      }
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
        context.supabase.from("family_relationships").delete().or(`child_user_id.eq.${context.userId},parent_user_id.eq.${context.userId}`),
        context.supabase.from("family_members").delete().eq("user_id", context.userId),
        context.supabase.from("subscriptions").delete().eq("user_id", context.userId),
        context.supabase.from("profiles").delete().eq("id", context.userId),
      ]);
    } catch (err) {
      console.warn("Supabase record deletion error:", err);
    }

    // 3. Mark user_metadata as permanently deleted in Supabase Auth
    // NOTE: Only update 'data' (user_metadata) — never pass password or email so Supabase Auth does not require current password
    try {
      await context.supabase.auth.updateUser({
        data: {
          is_deleted: true,
          account_status: "deleted",
          deleted_at: new Date().toISOString(),
          original_email: email,
        },
      });
    } catch (authErr) {
      console.warn("Supabase auth updateUser metadata notice:", authErr);
    }

    // 4. Attempt to delete from Supabase Auth via RPC if available
    try {
      await context.supabase.rpc("delete_current_user");
    } catch (rpcErr) {
      console.warn("RPC delete_current_user notice:", rpcErr);
    }

    // 5. Delete from Supabase Auth if admin key is present
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

/**
 * Register a child account strictly verified and linked to an adult guardian (Father, Mother, or Guardian).
 */
export const registerChildWithGuardianFn = createServerFn({ method: "POST" })
  .validator(
    (input: {
      child_full_name: string;
      child_email: string;
      child_password: string;
      child_dob: string;
      child_gender: "female" | "male";
      guardian_email: string;
      guardian_password: string;
      relationship_type?: "father" | "mother" | "guardian";
    }) => input,
  )
  .handler(async ({ data }): Promise<{ success: boolean; childId: string; guardianName: string }> => {
    const childAge = calculateAge(data.child_dob);
    if (childAge >= 18) {
      throw new Response(
        JSON.stringify({
          error: "not_a_minor",
          message: "هذا الحساب لبالغ (18 سنة أو أكثر) — يرجى استخدام التسجيل العادي.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    if (childAge < 3) {
      throw new Response(
        JSON.stringify({
          error: "invalid_dob",
          message: "تاريخ الميلاد غير صالح (الحد الأدنى 3 سنوات).",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const cleanGuardianEmail = data.guardian_email.trim().toLowerCase();
    const cleanChildEmail = data.child_email.trim().toLowerCase();

    if (cleanGuardianEmail === cleanChildEmail) {
      throw new Response(
        JSON.stringify({
          error: "same_email",
          message: "لا يمكن أن يكون بريد الطفل مطابقاً لبريد ولي الأمر.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    // 1. Authenticate Guardian to verify identity and adult status
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://pdgdqlqjwvwbgrgziuvt.supabase.co";
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wsia1nTheJe6eXdXmxSFkw_VTt1FP_j";
    const authClient = createClient(supabaseUrl, supabaseKey);

    let guardianId = "";
    let guardianFullName = "ولي الأمر";

    // Support demo guardian login (e.g. mariam@wazen.app / deema / saja)
    const isDemoGuardian = isDemoAccount(cleanGuardianEmail);
    if (isDemoGuardian) {
      const { data: demoGuardianAuth, error: demoErr } = await authClient.auth.signInWithPassword({
        email: cleanGuardianEmail === "saja@wazen.app" ? "deema@wazen.app" : cleanGuardianEmail,
        password: data.guardian_password,
      });
      if (demoErr || !demoGuardianAuth.user) {
        throw new Response(
          JSON.stringify({
            error: "invalid_guardian_credentials",
            message: "كلمة مرور حساب ولي الأمر التجريبي غير صحيحة (استخدم: 12345678).",
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
      guardianId = demoGuardianAuth.user.id;
    } else {
      const { data: guardianAuth, error: guardianAuthError } = await authClient.auth.signInWithPassword({
        email: cleanGuardianEmail,
        password: data.guardian_password,
      });

      if (guardianAuthError || !guardianAuth.user) {
        throw new Response(
          JSON.stringify({
            error: "invalid_guardian_credentials",
            message: "بيانات ولي الأمر غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور لولي الأمر (الأب أو الأم).",
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
      guardianId = guardianAuth.user.id;
    }

    // Check Guardian's age / profile
    const { data: guardianProfile } = await authClient
      .from("profiles")
      .select("id, full_name, date_of_birth, life_stage")
      .eq("id", guardianId)
      .maybeSingle();

    if (guardianProfile?.date_of_birth && calculateAge(guardianProfile.date_of_birth) < 18) {
      throw new Response(
        JSON.stringify({
          error: "guardian_must_be_adult",
          message: "لا يمكن لولي الأمر أن يكون قاصراً (أقل من 18 عاماً).",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    if (guardianProfile?.full_name) {
      guardianFullName = guardianProfile.full_name;
    }

    // 2. Create the child account (clear any stale deleted record first)
    await prepareEmailForSignUpFn({ data: { email: cleanChildEmail } }).catch(() => {});
    let childUserId = "";
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanChildEmail,
        password: data.child_password,
        email_confirm: true,
        user_metadata: {
          wazen_walkthrough_eligible: true,
          guardian_id: guardianId,
          relationship: data.relationship_type || "guardian",
        },
      });

      if (createError) {
        throw new Response(
          JSON.stringify({
            error: "child_create_failed",
            message: createError.message,
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      childUserId = createdUser.user.id;
    } else {
      // Fallback using client signup
      const { data: signUpRes, error: signUpError } = await authClient.auth.signUp({
        email: cleanChildEmail,
        password: data.child_password,
        options: {
          data: {
            wazen_walkthrough_eligible: true,
            guardian_id: guardianId,
          },
        },
      });
      if (signUpError || !signUpRes.user) {
        throw new Response(
          JSON.stringify({
            error: "child_create_failed",
            message: signUpError?.message || "تعذر إنشاء حساب الطفل",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      childUserId = signUpRes.user.id;
    }

    // 3. Insert child profile
    const childProfileData = {
      id: childUserId,
      full_name: firstNameOf(data.child_full_name),
      date_of_birth: data.child_dob,
      gender: data.child_gender,
      life_stage: "child",
      account_type: "child",
      language: "ar",
      base_currency: "KWD",
    };

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("profiles").upsert(childProfileData);

      // 4. Link in family_relationships
      await supabaseAdmin.from("family_relationships").upsert(
        {
          parent_user_id: guardianId,
          child_user_id: childUserId,
          relationship_type: data.relationship_type || "guardian",
          permissions: { can_monitor: true, can_fund: true },
          status: "active",
        },
        { onConflict: "parent_user_id,child_user_id" },
      );

      // 5. Check if guardian has family group in family_members
      const { data: guardianFamilyMember } = await supabaseAdmin
        .from("family_members")
        .select("family_id")
        .eq("user_id", guardianId)
        .maybeSingle();

      if (guardianFamilyMember?.family_id) {
        await supabaseAdmin.from("family_members").upsert(
          {
            family_id: guardianFamilyMember.family_id,
            user_id: childUserId,
            member_role: "child",
            seat_kind: "child",
            seat_suspended: false,
          },
          { onConflict: "user_id" },
        );
      }
    } else {
      await authClient.from("profiles").upsert(childProfileData);
    }

    // 6. MongoDB Atlas sync (if configured)
    try {
      const { getDatabase, isMongoConfigured, COLLECTIONS } = await import("@/lib/mongodb.server");
      if (isMongoConfigured()) {
        const db = await getDatabase();
        const now = new Date().toISOString();
        await Promise.allSettled([
          db.collection(COLLECTIONS.profiles).updateOne(
            { _id: childUserId },
            {
              $set: {
                _id: childUserId,
                user_id: childUserId,
                email: cleanChildEmail,
                full_name: firstNameOf(data.child_full_name),
                date_of_birth: data.child_dob,
                gender: data.child_gender,
                life_stage: "child",
                currency: "KWD",
                created_at: now,
                updated_at: now,
              },
            },
            { upsert: true },
          ),
          db.collection("family_relationships").updateOne(
            { parent_user_id: guardianId, child_user_id: childUserId },
            {
              $set: {
                parent_user_id: guardianId,
                child_user_id: childUserId,
                relationship_type: data.relationship_type || "guardian",
                permissions: { can_monitor: true, can_fund: true },
                status: "active",
                updated_at: now,
              },
            },
            { upsert: true },
          ),
        ]);
      }
    } catch (mongoErr) {
      console.warn("MongoDB child registration error:", mongoErr);
    }

    return {
      success: true,
      childId: childUserId,
      guardianName: guardianFullName,
    };
  });

/**
 * Allows an authenticated parent/guardian to add a child directly to their family from dashboard.
 */
export const parentAddChildFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      child_full_name: string;
      child_email: string;
      child_password: string;
      child_dob: string;
      child_gender: "female" | "male";
      relationship_type?: "father" | "mother" | "guardian";
    }) => input,
  )
  .handler(async ({ context, data }): Promise<{ success: boolean; childId: string }> => {
    const childAge = calculateAge(data.child_dob);
    if (childAge >= 18) {
      throw new Response(
        JSON.stringify({
          error: "not_a_minor",
          message: "هذا الحساب لبالغ (18 سنة أو أكثر) — يمكنه التسجيل بشكل مستقل.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    if (childAge < 3) {
      throw new Response(
        JSON.stringify({
          error: "invalid_dob",
          message: "تاريخ الميلاد غير صالح (الحد الأدنى 3 سنوات).",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const cleanChildEmail = data.child_email.trim().toLowerCase();

    // 1. Verify parent is adult
    const { data: parentProfile } = await context.supabase
      .from("profiles")
      .select("id, full_name, date_of_birth")
      .eq("id", context.userId)
      .maybeSingle();

    if (parentProfile?.date_of_birth && calculateAge(parentProfile.date_of_birth) < 18) {
      throw new Response(
        JSON.stringify({
          error: "guardian_must_be_adult",
          message: "لا يمكن للقاصرين إضافة أطفال.",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const guardianId = context.userId;

    // 2. Create child in Supabase (clear any stale deleted record first)
    await prepareEmailForSignUpFn({ data: { email: cleanChildEmail } }).catch(() => {});
    let childUserId = "";
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanChildEmail,
        password: data.child_password,
        email_confirm: true,
        user_metadata: {
          wazen_walkthrough_eligible: true,
          guardian_id: guardianId,
          relationship: data.relationship_type || "guardian",
        },
      });

      if (createError) {
        throw new Response(
          JSON.stringify({ error: "child_create_failed", message: createError.message }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      childUserId = createdUser.user.id;
    } else {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://pdgdqlqjwvwbgrgziuvt.supabase.co";
      const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_wsia1nTheJe6eXdXmxSFkw_VTt1FP_j";
      const authClient = createClient(supabaseUrl, supabaseKey);
      const { data: signUpRes, error: signUpError } = await authClient.auth.signUp({
        email: cleanChildEmail,
        password: data.child_password,
        options: {
          data: {
            wazen_walkthrough_eligible: true,
            guardian_id: guardianId,
          },
        },
      });
      if (signUpError || !signUpRes.user) {
        throw new Response(
          JSON.stringify({ error: "child_create_failed", message: signUpError?.message || "تعذر إنشاء حساب الطفل" }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      childUserId = signUpRes.user.id;
    }

    // 3. Insert child profile
    const childProfileData = {
      id: childUserId,
      full_name: firstNameOf(data.child_full_name),
      date_of_birth: data.child_dob,
      gender: data.child_gender,
      life_stage: "child",
      account_type: "child",
      language: "ar",
      base_currency: "KWD",
    };

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("profiles").upsert(childProfileData);

      // 4. Link in family_relationships
      await supabaseAdmin.from("family_relationships").upsert(
        {
          parent_user_id: guardianId,
          child_user_id: childUserId,
          relationship_type: data.relationship_type || "guardian",
          permissions: { can_monitor: true, can_fund: true },
          status: "active",
        },
        { onConflict: "parent_user_id,child_user_id" },
      );

      // 5. Link in family_members if family exists
      const { data: guardianFamilyMember } = await supabaseAdmin
        .from("family_members")
        .select("family_id")
        .eq("user_id", guardianId)
        .maybeSingle();

      if (guardianFamilyMember?.family_id) {
        await supabaseAdmin.from("family_members").upsert(
          {
            family_id: guardianFamilyMember.family_id,
            user_id: childUserId,
            member_role: "child",
            seat_kind: "child",
            seat_suspended: false,
          },
          { onConflict: "user_id" },
        );
      }
    } else {
      await context.supabase.from("profiles").upsert(childProfileData);
      await context.supabase.from("family_relationships").upsert(
        {
          parent_user_id: guardianId,
          child_user_id: childUserId,
          relationship_type: data.relationship_type || "guardian",
          permissions: { can_monitor: true, can_fund: true },
          status: "active",
        },
        { onConflict: "parent_user_id,child_user_id" },
      );
    }

    // 6. MongoDB Atlas sync (if configured)
    try {
      const { getDatabase, isMongoConfigured, COLLECTIONS } = await import("@/lib/mongodb.server");
      if (isMongoConfigured()) {
        const db = await getDatabase();
        const now = new Date().toISOString();
        await Promise.allSettled([
          db.collection(COLLECTIONS.profiles).updateOne(
            { _id: childUserId },
            {
              $set: {
                _id: childUserId,
                user_id: childUserId,
                email: cleanChildEmail,
                full_name: firstNameOf(data.child_full_name),
                date_of_birth: data.child_dob,
                gender: data.child_gender,
                life_stage: "child",
                currency: "KWD",
                created_at: now,
                updated_at: now,
              },
            },
            { upsert: true },
          ),
          db.collection("family_relationships").updateOne(
            { parent_user_id: guardianId, child_user_id: childUserId },
            {
              $set: {
                parent_user_id: guardianId,
                child_user_id: childUserId,
                relationship_type: data.relationship_type || "guardian",
                permissions: { can_monitor: true, can_fund: true },
                status: "active",
                updated_at: now,
              },
            },
            { upsert: true },
          ),
        ]);
      }
    } catch (mongoErr) {
      console.warn("MongoDB parentAddChild error:", mongoErr);
    }

    return { success: true, childId: childUserId };
  });
