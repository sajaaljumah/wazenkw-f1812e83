/**
 * Adult dashboard AI assistant (server).
 *
 * Signed-in university students, employees, self-employed users and parents
 * only. Every row is read with the user-scoped client (RLS applies) and
 * filtered to the caller's own user id, so family members' private data is
 * never included. The existing OpenRouter service is reused; the key stays on
 * the server and the browser can never send its own system prompt.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ADULT_CHAT_LIMITS,
  buildAdultFinancialSummary,
  buildAdultSystemPrompt,
  isAdultChatStage,
  sanitizeAdultHistory,
} from "@/lib/adult-chat";
import { firstNameOf } from "@/lib/wazen";
import { firstOfMonth, type Budget, type Goal, type RecurringItem, type Transaction } from "@/lib/finance";
import { canOwnAssets, type Asset } from "@/lib/assets";

export type AdultChatResult =
  | { ok: true; reply: string }
  | { ok: false; code: "NOT_ALLOWED" | "NOT_CONFIGURED" | "BUSY" | "UNAVAILABLE" };

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
          .max(ADULT_CHAT_LIMITS.maxMessageChars * 6),
      }),
    )
    .min(1)
    .max(80),
});

export const sendAdultFinanceChatFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<AdultChatResult> => {
    const { supabase, userId } = context;

    const last = data.messages[data.messages.length - 1];
    if (!last || last.role !== "user" || last.content.length > ADULT_CHAT_LIMITS.maxMessageChars) {
      throw new Error("Invalid message.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, life_stage, base_currency")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error("Could not load profile.");
    if (!profile || !isAdultChatStage(profile.life_stage)) return { ok: false, code: "NOT_ALLOWED" };

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString().slice(0, 10);
    const includeAssets = canOwnAssets(profile.life_stage);

    const [transactions, goals, budget, recurring, assets] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).gte("occurred_on", since).limit(5000),
      supabase.from("goals").select("*").eq("user_id", userId),
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("period_month", firstOfMonth(now))
        .maybeSingle(),
      supabase.from("recurring_items").select("*").eq("user_id", userId).eq("active", true),
      includeAssets
        ? supabase.from("assets").select("*").eq("user_id", userId)
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (transactions.error || goals.error || recurring.error) throw new Error("Could not load financial data.");

    // Lifetime available money needs every transaction, not just the last year.
    const { data: allTx } = await supabase
      .from("transactions")
      .select("kind, amount, goal_id, occurred_on, category")
      .eq("user_id", userId)
      .lt("occurred_on", since)
      .limit(20000);

    const recent = (transactions.data ?? []) as unknown as Transaction[];
    const older = (allTx ?? []) as unknown as Transaction[];

    const summary = buildAdultFinancialSummary({
      currency: profile.base_currency,
      transactions: [...older, ...recent],
      goals: (goals.data ?? []) as unknown as Goal[],
      budget: (budget.data ?? null) as unknown as Budget | null,
      recurring: (recurring.data ?? []) as unknown as RecurringItem[],
      assets: includeAssets ? ((assets.data ?? []) as unknown as Asset[]) : null,
      now,
    });

    const { sendChatCompletion } = await import("@/lib/openrouter.server");
    const result = await sendChatCompletion(
      [
        {
          role: "system",
          content: buildAdultSystemPrompt({
            firstName: firstNameOf(profile.full_name),
            lifeStage: profile.life_stage,
            language: data.language,
            summary,
          }),
        },
        ...sanitizeAdultHistory(data.messages),
      ],
      { temperature: 0.4, max_tokens: 3000, contentOnly: true, timeoutMs: 60000 },
    );

    if (result.success) return { ok: true, reply: result.content };

    console.error("[adult-chat] AI request failed:", result.error, result.message);
    if (result.error === "NO_API_KEY") return { ok: false, code: "NOT_CONFIGURED" };
    if (result.error === "RATE_LIMITED") return { ok: false, code: "BUSY" };
    return { ok: false, code: "UNAVAILABLE" };
  });
