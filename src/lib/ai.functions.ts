/**
 * Wazen AI Server Functions (RPC Gateway).
 *
 * Bridge between client UI and OpenRouter backend service.
 * Runs exclusively on the server.
 * Never exposes the OpenRouter API key to the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  ChatCompletionResult,
  FinancialAdviceResult,
  PersonalizedLearningResult,
  QuizResult,
  ChallengeResult,
  OpenRouterError,
  LifeStage,
  FinancialContext,
  ChatMessage,
} from "@/lib/openrouter.server";

export type {
  ChatCompletionResult,
  FinancialAdviceResult,
  PersonalizedLearningResult,
  QuizResult,
  ChallengeResult,
  OpenRouterError,
  LifeStage,
  FinancialContext,
  ChatMessage,
};

const lifeStageSchema = z.enum([
  "child",
  "teenager",
  "university_student",
  "employee",
  "self_employed",
  "parent",
]);

const financialContextSchema = z.object({
  income: z.number().optional(),
  expenses: z.number().optional(),
  budget: z.number().optional(),
  savings: z.number().optional(),
  goals: z
    .array(
      z.object({
        name: z.string(),
        target: z.number(),
        current: z.number().optional(),
      }),
    )
    .optional(),
  emergency_fund: z.number().optional(),
  spending_categories: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),
  investments: z
    .array(
      z.object({
        name: z.string(),
        value: z.number(),
      }),
    )
    .optional(),
  learning_progress: z
    .object({
      xp: z.number().optional(),
      streak: z.number().optional(),
      completedLessons: z.number().optional(),
    })
    .optional(),
});

/**
 * Check if OpenRouter AI is configured on the server without returning the key.
 */
export const checkAiConfiguredFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ configured: boolean }> => {
    const { isOpenRouterConfigured } = await import("@/lib/openrouter.server");
    return { configured: isOpenRouterConfigured() };
  },
);

/**
 * 1. Send chat completion
 */
export const sendChatCompletionFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string().min(1),
          }),
        ),
        options: z
          .object({
            model: z.string().optional(),
            temperature: z.number().min(0).max(2).optional(),
            max_tokens: z.number().min(10).max(4000).optional(),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ChatCompletionResult | OpenRouterError> => {
    const { sendChatCompletion } = await import("@/lib/openrouter.server");
    return sendChatCompletion(data.messages as ChatMessage[], data.options);
  });

/**
 * 2. Get Financial Advice with context
 */
export const getFinancialAdviceFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        prompt: z.string().min(1),
        context: financialContextSchema.nullable().optional(),
        lifeStage: lifeStageSchema.optional().default("employee"),
        language: z.enum(["ar", "en"]).optional().default("ar"),
        model: z.string().optional(),
      })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<{ success: true; data: FinancialAdviceResult } | OpenRouterError> => {
      const { sendFinancialAdvice } = await import("@/lib/openrouter.server");
      return sendFinancialAdvice(data.prompt, data.context as FinancialContext | null | undefined, {
        lifeStage: data.lifeStage,
        language: data.language,
        model: data.model,
      });
    },
  );

/**
 * 3. Generate Personalized Learning Lesson
 */
export const getPersonalizedLearningFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        topic: z.string().min(1),
        lifeStage: lifeStageSchema.optional().default("employee"),
        language: z.enum(["ar", "en"]).optional().default("ar"),
        model: z.string().optional(),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true; data: PersonalizedLearningResult } | OpenRouterError> => {
      const { generatePersonalizedLearning } = await import("@/lib/openrouter.server");
      return generatePersonalizedLearning(data.topic, data.lifeStage, data.language, {
        model: data.model,
      });
    },
  );

/**
 * 4. Generate Interactive Quiz
 */
export const getQuizFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        topic: z.string().min(1),
        lifeStage: lifeStageSchema.optional().default("child"),
        language: z.enum(["ar", "en"]).optional().default("ar"),
        questionCount: z.number().min(1).max(10).optional().default(3),
        model: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ success: true; data: QuizResult } | OpenRouterError> => {
    const { generateQuiz } = await import("@/lib/openrouter.server");
    return generateQuiz(data.topic, data.lifeStage, data.language, data.questionCount, {
      model: data.model,
    });
  });

/**
 * 5. Generate Financial Challenge
 */
export const getChallengeFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        topic: z.string().min(1),
        lifeStage: lifeStageSchema.optional().default("teenager"),
        language: z.enum(["ar", "en"]).optional().default("ar"),
        model: z.string().optional(),
      })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<{ success: true; data: ChallengeResult } | OpenRouterError> => {
      const { generateChallenge } = await import("@/lib/openrouter.server");
      return generateChallenge(data.topic, data.lifeStage, data.language, {
        model: data.model,
      });
    },
  );

/**
 * 6. Extract fields from uploaded document using AI
 */
export const extractReceiptFn = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        fileName: z.string(),
        kind: z.string(),
        currency: z.string().optional().default("KWD"),
        textContent: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { extractReceiptWithAi } = await import("@/lib/openrouter.server");
    return extractReceiptWithAi(data.fileName, data.kind, data.currency, data.textContent);
  });

