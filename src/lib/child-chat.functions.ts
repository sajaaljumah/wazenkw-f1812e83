/**
 * Child learning-buddy chat (server).
 *
 * Signed-in children only. Reads the child's OWN profile, learning progress,
 * challenges, goal and savings through the user-scoped client (RLS applies),
 * then calls the existing OpenRouter service. The API key never leaves the
 * server and the client can never send its own system prompt.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CHILD_CHAT_LIMITS,
  buildChildChatContext,
  buildChildSystemPrompt,
  sanitizeChildHistory,
} from "@/lib/child-chat";
import { calculateAge, firstNameOf } from "@/lib/wazen";
import { savedForGoal, totalsFor, type Transaction } from "@/lib/finance";
import type { LearningChallenge, LearningProgress } from "@/lib/learning";

export type ChildChatResult =
  | { ok: true; reply: string }
  | {
      ok: false;
      code: "NOT_CHILD" | "NOT_CONFIGURED" | "BUSY" | "UNAVAILABLE";
    };

const inputSchema = z.object({
  language: z.enum(["ar", "en"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z
          .string()
          .trim()
          .min(1)
          .max(CHILD_CHAT_LIMITS.maxMessageChars * 4),
      }),
    )
    .min(1)
    .max(60),
});

export const sendChildLearningChatFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ChildChatResult> => {
    const { supabase, userId } = context;

    const last = data.messages[data.messages.length - 1];
    if (!last || last.role !== "user" || last.content.length > CHILD_CHAT_LIMITS.maxMessageChars) {
      throw new Error("Invalid message.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth, life_stage, gender")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not load profile.");
    if (!profile || profile.life_stage !== "child") return { ok: false, code: "NOT_CHILD" };

    const [learning, progress, challenges, goals, transactions] = await Promise.all([
      supabase
        .from("learning_profiles")
        .select("xp, current_streak")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("learning_progress").select("*").eq("user_id", userId),
      supabase.from("learning_challenges").select("*").eq("user_id", userId),
      supabase
        .from("goals")
        .select("id, name, kind, target_amount")
        .eq("user_id", userId)
        .eq("kind", "goal")
        .limit(1),
      supabase
        .from("transactions")
        .select(
          "id, user_id, kind, category, merchant, amount, currency, occurred_on, note, goal_id, created_at",
        )
        .eq("user_id", userId)
        .limit(1000),
    ]);

    const txList = (transactions.data ?? []) as unknown as Transaction[];
    const goal = goals.data?.[0] ?? null;
    const saved = goal ? savedForGoal(txList, goal.id) : 0;
    const target = goal ? Number(goal.target_amount) : 0;

    const chatContext = buildChildChatContext({
      firstName: firstNameOf(profile.full_name),
      gender: profile.gender === "female" || profile.gender === "male" ? profile.gender : null,
      age: calculateAge(profile.date_of_birth),
      language: data.language,
      xp: learning.data?.xp ?? 0,
      streak: learning.data?.current_streak ?? 0,
      goalName: goal?.name ?? null,
      badgeContext: {
        progress: (progress.data ?? []) as unknown as LearningProgress[],
        challenges: (challenges.data ?? []) as unknown as LearningChallenge[],
        totalSaved: totalsFor(txList).savings,
        goalPercent: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
        hasGoal: !!goal,
      },
    });

    const { sendChatCompletion } = await import("@/lib/openrouter.server");
    const result = await sendChatCompletion(
      [
        { role: "system", content: buildChildSystemPrompt(chatContext) },
        ...sanitizeChildHistory(data.messages),
      ],
      { temperature: 0.6, max_tokens: 2500, contentOnly: true },
    );

    if (result.success) return { ok: true, reply: result.content };

    console.error("[child-chat] AI request failed:", result.error, result.message);
    if (result.error === "NO_API_KEY") return { ok: false, code: "NOT_CONFIGURED" };
    if (result.error === "RATE_LIMITED") return { ok: false, code: "BUSY" };
    return { ok: false, code: "UNAVAILABLE" };
  });
