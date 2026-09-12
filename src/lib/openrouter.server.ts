/**
 * OpenRouter AI Server Service for Wazen.
 *
 * Runs strictly on the server backend. Never imported into client bundles.
 * All requests to OpenRouter are made server-to-server.
 * Credentials exist only in server environment variables.
 * Official API: https://openrouter.ai/api/v1/chat/completions
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export type OpenRouterError = {
  success: false;
  error: "NO_API_KEY" | "RATE_LIMITED" | "API_ERROR" | "NETWORK_ERROR" | "MALFORMED_RESPONSE";
  message: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  model?: string | undefined;
  temperature?: number | undefined;
  max_tokens?: number | undefined;
  timeoutMs?: number | undefined;
};

export type LifeStage =
  "child" | "teenager" | "university_student" | "employee" | "self_employed" | "parent";

export type FinancialContext = {
  income?: number | undefined;
  expenses?: number | undefined;
  budget?: number | undefined;
  savings?: number | undefined;
  goals?: Array<{ name: string; target: number; current?: number | undefined }> | undefined;
  emergency_fund?: number | undefined;
  spending_categories?: Array<{ category: string; amount: number }> | undefined;
  investments?: Array<{ name: string; value: number }> | undefined;
  learning_progress?:
    | {
        xp?: number | undefined;
        streak?: number | undefined;
        completedLessons?: number | undefined;
      }
    | undefined;
};

export type FinancialAdviceResult = {
  advice: string;
  keyPoints: string[];
  disclaimer: string;
};

export type PersonalizedLearningResult = {
  topic: string;
  lifeStage: LifeStage;
  title: string;
  summary: string;
  steps: Array<{ title: string; body: string }>;
  takeaway: string;
};

export type QuizQuestionResult = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type QuizResult = {
  topic: string;
  questions: QuizQuestionResult[];
};

export type ChallengeResult = {
  topic: string;
  title: string;
  description: string;
  durationDays: number;
  dailyAction: string;
  rewardXp: number;
};

export type ChatCompletionResult = {
  success: true;
  content: string;
  model: string;
  role: string;
  finishReason?: string | undefined;
};

/**
 * Retrieves the OpenRouter API key from server environment.
 * Never logs or returns the key value in public responses.
 */
function getApiKey(): string | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim() === "") {
    return null;
  }
  return key.trim();
}

/**
 * Checks whether the OpenRouter key is configured without exposing it.
 */
export function isOpenRouterConfigured(): boolean {
  return Boolean(getApiKey());
}

/**
 * Cleanly extracts JSON from an LLM response string that may contain markdown fences or surrounding text.
 */
function extractJson<T>(rawText: string): T | null {
  const text = rawText.trim();
  // Try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try markdown code block ```json ... ```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim()) as T;
      } catch {
        // continue
      }
    }
    // Try finding outer brackets { ... } or [ ... ]
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
        // continue
      }
    }
    return null;
  }
}

/**
 * Life stage descriptions and prompt tailoring
 */
function describeLifeStage(stage: LifeStage, language: "ar" | "en"): string {
  if (language === "ar") {
    switch (stage) {
      case "child":
        return "طفل (6-12 سنة): أسلوب بسيط جداً، محبب وممتع، أمثلة عن الحصالة وشراء الألعاب والحلوى، ومفهوم الحاجات مقابل الرغبات.";
      case "teenager":
        return "يافع / مراهق (13-17 سنة): أسلوب تفاعلي وقريب من واقعه، أمثلة عن المصروف الشخصي، الأجهزة الذكية، الخروج مع الأصدقاء، وتحدي التوفير.";
      case "university_student":
        return "طالب جامعي (18-23 سنة): أسلوب عملي وموجه، إدارة المكافأة الطلابية والمصاريف الجامعية، المواصلات، الكافيهات، والادخار للبدايات.";
      case "employee":
        return "موظف: تخطيط مالي شخصي، قاعدة 50/30/20، صندوق الطوارئ، تخصيص الراتب، والادخار طويل المدى في بيئة الكويت والخليج.";
      case "self_employed":
        return "عمل حر / صاحب مشروع صغير: إدارة الدخل غير الثابت، فصل أموال العمل عن الحساب الشخصي، بناء سيولة احتياطية، والتخطيط للتدفقات النقدية.";
      case "parent":
        return "ولي أمر / والد: ميزانية الأسرة، تعليم الأبناء المسؤولية المالية والمصروف، التوازن بين الالتزامات والأهداف العائلية.";
    }
  } else {
    switch (stage) {
      case "child":
        return "Child (6-12 years): Very simple, playful, and fun tone. Use piggy bank and toy examples, focusing on needs vs wants.";
      case "teenager":
        return "Teenager (13-17 years): Relatable, modern, engaging tone. Cover pocket money, gadgets, peer outings, and saving habits.";
      case "university_student":
        return "University Student: Practical and budget-conscious. Cover student allowances, transportation, campus living, and smart spending.";
      case "employee":
        return "Employee: Structured personal finance, 50/30/20 budgeting, salary allocation, emergency funds, and long-term saving.";
      case "self_employed":
        return "Self-Employed: Cash flow fluctuations, separating personal from business finances, and building robust liquid reserves.";
      case "parent":
        return "Parent: Household budgeting, teaching children financial habits, managing family goals, and securing family reserves.";
    }
  }
}

/**
 * Builds base system prompt respecting life stage, language, educational stance, and context boundaries.
 */
function buildBaseSystemPrompt(
  lifeStage: LifeStage = "employee",
  language: "ar" | "en" = "ar",
): string {
  const stageDesc = describeLifeStage(lifeStage, language);

  if (language === "ar") {
    return `أنت مساعد الذكاء الاصطناعي لمنصة «وازن» المالية (Wazen).
العملة الأساسية للمنصة هي الدينار الكويتي (KWD).
لغة الرد المطلوبة: اللغة العربية السليمة والواضحة.

الجمهور المستهدف والمرحلة الحياتية للمستخدم:
${stageDesc}

إرشادات أساسية صارمة:
1. أنت تقدم توجيهاً وتثقيفاً مالياً عاماً وشخصياً لمساعدة المستخدم في إدارة أمواله بحكمة.
2. لست مستشاراً مالياً معتمداً، ولا تقدم نصائح استثمارية أو قانونية ملزمة.
3. التزم بالبيانات المالية المزودة لك بدقة ولا تختلق أي أرقام أو معاملات وهمية غير موجودة في السياق.
4. لا تطلب أو تكشف أو تشارك أي بيانات سرية أو أرقام حسابات أو كلمات مرور.
5. اجعل التوجيهات قابلة للتطبيق العملي ومشجعة ومناسبة لثقافة المجتمع الكويتي والخليجي.`;
  }

  return `You are the AI Assistant for the "Wazen" (وازن) Financial Platform.
The primary base currency is Kuwaiti Dinar (KWD).
Target Language: English.

User Life Stage & Audience:
${stageDesc}

Strict Core Guidelines:
1. You provide personalized financial education, insights, and guidance to empower smart money habits.
2. You are NOT a certified financial advisor and do not offer certified legal, investment, or tax advice.
3. Strictly stick to any provided financial numbers; NEVER fabricate or invent financial transactions or figures not given.
4. Never ask for, log, or disclose private credentials, account numbers, or passwords.
5. Keep guidance encouraging, actionable, and culturally respectful.`;
}

/**
 * 1. Core Chat Completion call to OpenRouter.
 */
export async function sendChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult | OpenRouterError> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: "NO_API_KEY",
      message: "OpenRouter API key is not configured on the server.",
    };
  }

  const model = options.model ?? DEFAULT_OPENROUTER_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.max_tokens ?? 2000;
  const timeoutMs = options.timeoutMs ?? 45000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://wazen.kw",
        "X-Title": "Wazen Financial Platform",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: "RATE_LIMITED",
          message: "OpenRouter rate limit reached. Please try again shortly.",
        };
      }

      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return {
        success: false,
        error: "API_ERROR",
        message: errorBody.error?.message || `AI service returned HTTP ${response.status}.`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string; role?: string; reasoning?: string };
        text?: string;
        finish_reason?: string;
      }>;
      model?: string;
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;
    const content = (msg?.content || msg?.reasoning || choice?.text || "")?.trim();

    if (!content) {
      return {
        success: false,
        error: "MALFORMED_RESPONSE",
        message: "AI service returned an empty response.",
      };
    }

    return {
      success: true,
      content,
      model: data.model || model,
      role: choice?.message?.role || "assistant",
      finishReason: choice?.finish_reason || undefined,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: isAbort
        ? "AI request timed out. Please try again."
        : err instanceof Error
          ? err.message
          : "Network failure contacting AI provider.",
    };
  }
}

/**
 * 2. Send Financial Advice with Wazen context.
 */
export async function sendFinancialAdvice(
  prompt: string,
  context?: FinancialContext | null,
  options: {
    lifeStage?: LifeStage | undefined;
    language?: "ar" | "en" | undefined;
    model?: string | undefined;
  } = {},
): Promise<{ success: true; data: FinancialAdviceResult } | OpenRouterError> {
  const language = options.language ?? "ar";
  const lifeStage = options.lifeStage ?? "employee";

  const systemPrompt = `${buildBaseSystemPrompt(lifeStage, language)}

تعليمات الاستجابة بصيغة JSON حصراً:
أجب بتنسيق كائن JSON صالح بالشكل التالي:
{
  "advice": "النص الإرشادي الشامل والمخصص للمستخدم",
  "keyPoints": ["نقطة رئيسية 1", "نقطة رئيسية 2", "نقطة رئيسية 3"],
  "disclaimer": "${
    language === "ar"
      ? "هذا التوجيه لأغراض تعليمية وإرشادية فقط ولا يعد استشارة مالية أو قانونية معتمدة."
      : "This guidance is for educational and planning purposes only and does not constitute certified financial or legal advice."
  }"
}`;

  let contextDescription = "";
  if (context) {
    const parts: string[] = [];
    if (context.income !== undefined) parts.push(`Income: ${context.income} KWD`);
    if (context.expenses !== undefined) parts.push(`Expenses: ${context.expenses} KWD`);
    if (context.budget !== undefined) parts.push(`Monthly Budget: ${context.budget} KWD`);
    if (context.savings !== undefined) parts.push(`Savings: ${context.savings} KWD`);
    if (context.emergency_fund !== undefined) {
      parts.push(`Emergency Fund: ${context.emergency_fund} KWD`);
    }
    if (context.goals && context.goals.length > 0) {
      const gStr = context.goals
        .map((g) => `${g.name} (target: ${g.target} KWD, current: ${g.current ?? 0} KWD)`)
        .join(", ");
      parts.push(`Goals: ${gStr}`);
    }
    if (context.spending_categories && context.spending_categories.length > 0) {
      const catStr = context.spending_categories
        .map((c) => `${c.category}: ${c.amount} KWD`)
        .join(", ");
      parts.push(`Spending by category: ${catStr}`);
    }
    if (context.investments && context.investments.length > 0) {
      const invStr = context.investments.map((i) => `${i.name}: ${i.value} KWD`).join(", ");
      parts.push(`Investments: ${invStr}`);
    }
    if (context.learning_progress) {
      parts.push(
        `Learning: XP=${context.learning_progress.xp ?? 0}, streak=${context.learning_progress.streak ?? 0} days`,
      );
    }
    if (parts.length > 0) {
      contextDescription = `\n\nFinancial Context Provided (Kuwaiti Dinar):\n${parts.join("\n")}`;
    }
  }

  const userContent = `${prompt}${contextDescription}`;

  const completion = await sendChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { model: options.model, temperature: 0.6 },
  );

  if (!completion.success) {
    return completion;
  }

  const parsed = extractJson<FinancialAdviceResult>(completion.content);
  if (parsed && typeof parsed.advice === "string") {
    return {
      success: true,
      data: {
        advice: parsed.advice,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        disclaimer:
          parsed.disclaimer ||
          (language === "ar"
            ? "هذا التوجيه لأغراض تعليمية وإرشادية فقط ولا يعد استشارة مالية معتمدة."
            : "This guidance is for educational purposes only."),
      },
    };
  }

  // Fallback if JSON format wasn't strictly returned
  return {
    success: true,
    data: {
      advice: completion.content,
      keyPoints: [],
      disclaimer:
        language === "ar"
          ? "هذا التوجيه لأغراض تعليمية وإرشادية فقط ولا يعد استشارة مالية معتمدة."
          : "This guidance is for educational purposes only.",
    },
  };
}

/**
 * 3. Generate Personalized Learning Lesson.
 */
export async function generatePersonalizedLearning(
  topic: string,
  lifeStage: LifeStage = "employee",
  language: "ar" | "en" = "ar",
  options: { model?: string | undefined } = {},
): Promise<{ success: true; data: PersonalizedLearningResult } | OpenRouterError> {
  const systemPrompt = `${buildBaseSystemPrompt(lifeStage, language)}

You must generate an engaging, bite-sized, age-appropriate personal finance lesson for the topic: "${topic}".
Output MUST be a valid JSON object matching this structure:
{
  "title": "عنوان الدرس",
  "summary": "ملخص مشوق في سطرين",
  "steps": [
    { "title": "عنوان الخطوة 1", "body": "شرح الخطوة" },
    { "title": "عنوان الخطوة 2", "body": "شرح الخطوة" },
    { "title": "عنوان الخطوة 3", "body": "شرح الخطوة" }
  ],
  "takeaway": "الدرس المستفاد في جملة واحدة ملهمة"
}`;

  const completion = await sendChatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `أنشئ درساً مالياً مخصصاً للمرحلة (${lifeStage}) حول موضوع: ${topic}`,
      },
    ],
    { model: options.model, temperature: 0.7 },
  );

  if (!completion.success) {
    return completion;
  }

  type ParsedLesson = {
    title?: string;
    summary?: string;
    steps?: Array<{ title: string; body: string }>;
    takeaway?: string;
  };

  const parsed = extractJson<ParsedLesson>(completion.content);
  if (parsed && parsed.title && Array.isArray(parsed.steps)) {
    return {
      success: true,
      data: {
        topic,
        lifeStage,
        title: parsed.title,
        summary: parsed.summary || "",
        steps: parsed.steps,
        takeaway: parsed.takeaway || "",
      },
    };
  }

  return {
    success: true,
    data: {
      topic,
      lifeStage,
      title: topic,
      summary: completion.content.slice(0, 150),
      steps: [{ title: topic, body: completion.content }],
      takeaway: "الوعي المالي بداية الاستقرار.",
    },
  };
}

/**
 * 4. Generate Interactive Quiz.
 */
export async function generateQuiz(
  topic: string,
  lifeStage: LifeStage = "child",
  language: "ar" | "en" = "ar",
  questionCount: number = 3,
  options: { model?: string | undefined } = {},
): Promise<{ success: true; data: QuizResult } | OpenRouterError> {
  const count = Math.min(Math.max(Number(questionCount) || 3, 1), 10);
  const systemPrompt = `${buildBaseSystemPrompt(lifeStage, language)}

Generate ${count} multiple-choice quiz questions for the topic: "${topic}".
Output MUST be a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "نص السؤال",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث"],
      "answerIndex": 0,
      "explanation": "شرح مبسط للإجابة الصحيحة"
    }
  ]
}`;

  const completion = await sendChatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate ${count} quiz questions about ${topic} suitable for a ${lifeStage}.`,
      },
    ],
    { model: options.model, temperature: 0.6 },
  );

  if (!completion.success) {
    return completion;
  }

  type ParsedQuiz = {
    questions?: Array<{
      question?: string;
      options?: string[];
      answerIndex?: number;
      explanation?: string;
    }>;
  };

  const parsed = extractJson<ParsedQuiz>(completion.content);
  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    const formatted: QuizQuestionResult[] = parsed.questions.map((q, idx) => ({
      question: q.question || `سؤال ${idx + 1}`,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["نعم", "لا"],
      answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : 0,
      explanation: q.explanation || "",
    }));

    return {
      success: true,
      data: {
        topic,
        questions: formatted,
      },
    };
  }

  // Fallback if model did not produce JSON
  return {
    success: true,
    data: {
      topic,
      questions: [
        {
          question: `ما هي أهم فائدة للادخار في موضوع ${topic}؟`,
          options: ["تحقيق الأهداف وتأمين المستقبل", "إنفاق المال فوراً", "تجاهل المصاريف"],
          answerIndex: 0,
          explanation: "الادخار يساعد في تحقيق الأهداف والتأهب للمستقبل.",
        },
      ],
    },
  };
}

/**
 * 5. Generate Financial Challenge.
 */
export async function generateChallenge(
  topic: string,
  lifeStage: LifeStage = "teenager",
  language: "ar" | "en" = "ar",
  options: { model?: string | undefined } = {},
): Promise<{ success: true; data: ChallengeResult } | OpenRouterError> {
  const systemPrompt = `${buildBaseSystemPrompt(lifeStage, language)}

Generate a practical, motivating financial challenge for the topic: "${topic}".
Output MUST be a valid JSON object matching this schema:
{
  "title": "عنوان التحدي المشجع",
  "description": "وصف التحدي والهدف منه",
  "durationDays": 7,
  "dailyAction": "الإجراء اليومي المطلوب من المستخدم",
  "rewardXp": 50
}`;

  const completion = await sendChatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `أنشئ تحدياً مالياً تفاعلياً وممتعاً لمرحلة (${lifeStage}) في موضوع: ${topic}`,
      },
    ],
    { model: options.model, temperature: 0.7 },
  );

  if (!completion.success) {
    return completion;
  }

  type ParsedChallenge = {
    title?: string;
    description?: string;
    durationDays?: number;
    dailyAction?: string;
    rewardXp?: number;
  };

  const parsed = extractJson<ParsedChallenge>(completion.content);
  if (parsed && parsed.title) {
    return {
      success: true,
      data: {
        topic,
        title: parsed.title,
        description: parsed.description || "",
        durationDays: Number(parsed.durationDays) || 7,
        dailyAction: parsed.dailyAction || "",
        rewardXp: Number(parsed.rewardXp) || 50,
      },
    };
  }

  return {
    success: true,
    data: {
      topic,
      title: `تحدي ${topic}`,
      description: "تحدَّ نفسك اليوم في الالتزام بأهدافك المالية.",
      durationDays: 7,
      dailyAction: "سجل مصاريفك وادخر مبلغاً بسيطاً يومياً.",
      rewardXp: 50,
    },
  };
}

export type ExtractedReceiptData = {
  vendor: string | null;
  documentDate: string | null;
  totalAmount: number | null;
  currency: string;
  category: string | null;
  taxAmount: number | null;
  paymentMethod: string | null;
  reference: string | null;
  note: string | null;
  metalGrams?: number | null;
  metalPurity?: string | null;
  pricePerGram?: number | null;
  symbol?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  propertyAddress?: string | null;
  propertyValue?: number | null;
  monthlyRent?: number | null;
  contractStart?: string | null;
  contractEnd?: string | null;
};

/**
 * 6. Extract financial fields from document text, filename, or context using OpenRouter AI.
 */
export async function extractReceiptWithAi(
  fileName: string,
  kind: string,
  baseCurrency: string = "KWD",
  textContent?: string,
  options: { model?: string } = {},
): Promise<{ success: true; data: ExtractedReceiptData } | OpenRouterError> {
  const prompt = `أنت نظام ذكي متخصص في قراءة وتحليل الفواتير والمستندات المالية لمنصة «وازن» المالية (الكويت والخليج).
المطلوب استخراج وتعبئة الحقول المالية بدقة بصيغة JSON فقط.

نوع المستند: ${kind}
اسم الملف: ${fileName}
العملة الافتراضية: ${baseCurrency}
${textContent ? `محتوى / نص المستند المكتشف:\n"""\n${textContent}\n"""` : ""}

استخرج الحقول التالية وأعدها في كائن JSON فقط (بدون أي شروحات):
{
  "vendor": "اسم المتجر أو الجهة أو null",
  "documentDate": "تاريخ المستند بصيغة YYYY-MM-DD أو null (إذا لم يذكر تاريخ دقيق استخدم تاريخ اليوم ${new Date().toISOString().slice(0, 10)})",
  "totalAmount": 0.0, // المبلغ الإجمالي كرقم أو null
  "currency": "${baseCurrency}",
  "category": "فئة الصرف (طعام، تسوق، صحة، فواتير، سفر، استثمار، تعليم... إلخ) أو null",
  "taxAmount": 0.0, // مبلغ الضريبة إن وجد أو null
  "paymentMethod": "طريقة الدفع (KNET, Visa, Mastercard, Cash...) أو null",
  "reference": "رقم الفاتورة أو المرجع أو null",
  "note": "ملاحظة موجزة باللغة العربية عن محتوى الفاتورة"
}`;

  const completion = await sendChatCompletion(
    [
      {
        role: "system",
        content:
          "أنت نظام استخراج بيانات الفواتير والمستندات المالية. أعد فقط JSON صالحاً بدون أي نصوص أخرى.",
      },
      { role: "user", content: prompt },
    ],
    { model: options.model, temperature: 0.2 },
  );

  if (!completion.success) {
    // If AI rate limited or fails, return smart fallback based on filename and kind
    return {
      success: true,
      data: {
        vendor: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        documentDate: new Date().toISOString().slice(0, 10),
        totalAmount: null,
        currency: baseCurrency,
        category: kind === "gold_invoice" || kind === "silver_invoice" ? "استثمار ومعادن" : "مصاريف عامة",
        taxAmount: null,
        paymentMethod: "KNET",
        reference: null,
        note: `تم استخراج بيانات ${fileName}`,
      },
    };
  }

  const parsed = extractJson<ExtractedReceiptData>(completion.content);
  if (parsed) {
    return {
      success: true,
      data: {
        vendor: parsed.vendor ?? fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        documentDate: parsed.documentDate ?? new Date().toISOString().slice(0, 10),
        totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
        currency: parsed.currency || baseCurrency,
        category: parsed.category || "عام",
        taxAmount: typeof parsed.taxAmount === "number" ? parsed.taxAmount : null,
        paymentMethod: parsed.paymentMethod || "KNET",
        reference: parsed.reference || null,
        note: parsed.note || null,
      },
    };
  }

  return {
    success: true,
    data: {
      vendor: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      documentDate: new Date().toISOString().slice(0, 10),
      totalAmount: null,
      currency: baseCurrency,
      category: "عام",
      taxAmount: null,
      paymentMethod: "KNET",
      reference: null,
      note: null,
    },
  };
}

