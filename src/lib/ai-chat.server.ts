/**
 * Shared server-only helpers for Wazen's AI chats (Wazen AI + رفيق وازن).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendChatCompletion,
  type ChatCompletionOptions,
  type ChatCompletionResult,
  type ChatMessage,
  type OpenRouterError,
} from "@/lib/openrouter.server";

/** AI chat is a Premium feature; children/teens inherit it from the family plan. */
export async function hasAiChatAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { loadEntitlements } = await import("@/lib/subscription.server");
  const { hasFeature } = await import("@/lib/subscription");
  const entitlements = await loadEntitlements(supabase, userId);
  return hasFeature(entitlements, "ai_advisor");
}

/**
 * Free OpenRouter models sometimes return an empty answer or fail briefly, so
 * transient failures are retried a couple of times before reporting an error.
 * Missing key and rate limits are never retried.
 */
export async function sendChatWithRetry(
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  attempts = 3,
): Promise<ChatCompletionResult | OpenRouterError> {
  let last: ChatCompletionResult | OpenRouterError | null = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await sendChatCompletion(messages, options);
    if (last.success) return last;
    if (last.error === "NO_API_KEY" || last.error === "RATE_LIMITED") return last;
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
  }
  return last!;
}
