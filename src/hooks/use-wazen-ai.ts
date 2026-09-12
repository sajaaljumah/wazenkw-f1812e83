/**
 * Wazen AI React Query Hooks.
 *
 * Provides reusable hooks for:
 * - Dashboard AI insights
 * - Financial advice
 * - Child/Teen personalized learning
 * - Quizzes
 * - Challenges
 * - Chat completions
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  checkAiConfiguredFn,
  getFinancialAdviceFn,
  getPersonalizedLearningFn,
  getQuizFn,
  getChallengeFn,
  sendChatCompletionFn,
} from "@/lib/ai.functions";
import type {
  FinancialAdviceResult,
  PersonalizedLearningResult,
  QuizResult,
  ChallengeResult,
  ChatCompletionResult,
  OpenRouterError,
  LifeStage,
  FinancialContext,
  ChatMessage,
} from "@/lib/ai.functions";

/**
 * Hook to check whether OpenRouter AI is configured on the server.
 */
export function useAiConfigured() {
  return useQuery({
    queryKey: ["ai-configured"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await checkAiConfiguredFn();
      return res.configured;
    },
  });
}

/**
 * Hook for generating financial advice based on user prompt and Wazen financial context.
 */
export function useFinancialAdvice() {
  return useMutation<
    FinancialAdviceResult,
    Error,
    {
      prompt: string;
      context?: FinancialContext | null | undefined;
      lifeStage?: LifeStage | undefined;
      language?: "ar" | "en" | undefined;
      model?: string | undefined;
    }
  >({
    mutationFn: async (variables) => {
      const res = await getFinancialAdviceFn({ data: variables });
      if (!res.success) {
        throw new Error((res as OpenRouterError).message || "Failed to generate financial advice.");
      }
      return res.data;
    },
  });
}

/**
 * Hook for generating personalized learning lessons.
 */
export function usePersonalizedLearning() {
  return useMutation<
    PersonalizedLearningResult,
    Error,
    {
      topic: string;
      lifeStage?: LifeStage | undefined;
      language?: "ar" | "en" | undefined;
      model?: string | undefined;
    }
  >({
    mutationFn: async (variables) => {
      const res = await getPersonalizedLearningFn({ data: variables });
      if (!res.success) {
        throw new Error((res as OpenRouterError).message || "Failed to generate learning content.");
      }
      return res.data;
    },
  });
}

/**
 * Hook for generating interactive financial quizzes.
 */
export function useGenerateQuiz() {
  return useMutation<
    QuizResult,
    Error,
    {
      topic: string;
      lifeStage?: LifeStage | undefined;
      language?: "ar" | "en" | undefined;
      questionCount?: number | undefined;
      model?: string | undefined;
    }
  >({
    mutationFn: async (variables) => {
      const res = await getQuizFn({ data: variables });
      if (!res.success) {
        throw new Error((res as OpenRouterError).message || "Failed to generate quiz.");
      }
      return res.data;
    },
  });
}

/**
 * Hook for generating interactive financial challenges.
 */
export function useGenerateChallenge() {
  return useMutation<
    ChallengeResult,
    Error,
    {
      topic: string;
      lifeStage?: LifeStage | undefined;
      language?: "ar" | "en" | undefined;
      model?: string | undefined;
    }
  >({
    mutationFn: async (variables) => {
      const res = await getChallengeFn({ data: variables });
      if (!res.success) {
        throw new Error((res as OpenRouterError).message || "Failed to generate challenge.");
      }
      return res.data;
    },
  });
}

/**
 * Hook for general conversational chat completions.
 */
export function useAiChat() {
  return useMutation<
    ChatCompletionResult,
    Error,
    {
      messages: ChatMessage[];
      options?:
        | {
            model?: string | undefined;
            temperature?: number | undefined;
            max_tokens?: number | undefined;
          }
        | undefined;
    }
  >({
    mutationFn: async (variables) => {
      const res = await sendChatCompletionFn({ data: variables });
      if (!res.success) {
        throw new Error((res as OpenRouterError).message || "AI chat completion failed.");
      }
      return res as ChatCompletionResult;
    },
  });
}
