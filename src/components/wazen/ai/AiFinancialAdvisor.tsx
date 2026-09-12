import { useState } from "react";
import { AiIcon, ICON_STROKE, RetryIcon, SpinnerIcon } from "@/components/wazen/icons";
import { Button } from "@/components/ui/button";
import { useFinancialAdvice, useAiChat } from "@/hooks/use-wazen-ai";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import type { FinancialContext, LifeStage } from "@/lib/ai.functions";
import type { Budget, Goal, Transaction } from "@/lib/finance";
import { inMonth, monthKey, totalsFor } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function AiFinancialAdvisor({
  currency,
  transactions,
  goals,
  budget,
  lifeStage,
  className,
}: {
  currency: string;
  transactions: Transaction[];
  goals: Goal[];
  budget: Budget | null;
  lifeStage: LifeStage;
  className?: string;
}) {
  const { isArabic } = useWazenLocale();
  const isAr = isArabic;
  const [isOpen, setIsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"advice" | "chat">("advice");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const adviceMutation = useFinancialAdvice();
  const chatMutation = useAiChat();

  // Compute real financial context from recorded user transactions
  const key = monthKey(new Date());
  const monthTxs = inMonth(transactions, key);
  const monthTotals = totalsFor(monthTxs);
  const allTotals = totalsFor(transactions);

  // Group top categories for real context
  const catMap = new Map<string, number>();
  for (const tx of monthTxs) {
    if (tx.kind === "expense") {
      catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + Number(tx.amount));
    }
  }
  const spendingCategories = Array.from(catMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const context: FinancialContext = {
    income: monthTotals.income,
    expenses: monthTotals.expenses,
    budget: budget ? Number(budget.amount) : undefined,
    savings: allTotals.savings,
    emergency_fund: allTotals.savings,
    goals: goals.map((g) => ({
      name: g.name,
      target: Number(g.target_amount),
    })),
    spending_categories: spendingCategories,
  };

  const quickPrompts = isAr
    ? [
        {
          label: "تحليل المصاريف الشهرية",
          prompt: "قدم تحليلاً مالياً سريعاً لمصاريفي هذا الشهر مقارنة بدخلي وميزانيتي.",
        },
        {
          label: "نصيحة لزيادة التوفير",
          prompt: "ما هي أفضل خطوة عملية يمكنني اتخاذها اليوم لزيادة مدخراتي وتقليل الهدر؟",
        },
        {
          label: "تقييم أهداف الادخار",
          prompt: "قيم تقدمي في أهداف الادخار بناءً على وضعي المالي الحالي.",
        },
      ]
    : [
        {
          label: "Analyze monthly spending",
          prompt:
            "Provide a quick financial assessment of my expenses this month relative to income.",
        },
        {
          label: "Tips to boost savings",
          prompt: "What practical steps can I take today to increase my monthly savings rate?",
        },
        {
          label: "Review savings goals",
          prompt: "Evaluate my progress toward savings goals given my current cash flow.",
        },
      ];

  const handleRequestAdvice = (promptText: string) => {
    adviceMutation.mutate({
      prompt: promptText,
      context,
      lifeStage,
      language: isAr ? "ar" : "en",
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || chatMutation.isPending) return;

    const userText = customPrompt.trim();
    setCustomPrompt("");
    const newHistory = [...chatMessages, { role: "user" as const, content: userText }];
    setChatMessages(newHistory);

    // Build system message with real context summary
    const systemPrompt = isAr
      ? `أنت المستشار المالي الذكي لتطبيق وازن في الكويت. أجب بلغة عربية راقية وموجزة. المرحلة العمرية للمستخدم: ${lifeStage}. الدخل: ${monthTotals.income} ${currency}، المصاريف: ${monthTotals.expenses} ${currency}، المدخرات: ${allTotals.savings} ${currency}. الميزانية: ${budget ? Number(budget.amount) : "غير محددة"} ${currency}. لا تقدم نصائح مضاربة عالية المخاطر.`
      : `You are the Wazen AI Financial Assistant in Kuwait. Respond clearly and concisely. Life stage: ${lifeStage}. Income: ${monthTotals.income} ${currency}, Expenses: ${monthTotals.expenses} ${currency}, Savings: ${allTotals.savings} ${currency}. Do not give high-risk trading advice.`;

    chatMutation.mutate(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...newHistory.map((m) => ({ role: m.role, content: m.content })),
        ],
      },
      {
        onSuccess: (data) => {
          setChatMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        },
      },
    );
  };

  return (
    <section
      className={cn("wazen-card relative overflow-hidden border border-border/80", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <AiIcon className="size-5" strokeWidth={ICON_STROKE} />
          </span>
          <div>
            <h2 className="text-lg font-semibold sm:text-xl">
              {isAr ? "مستشار وازن المالي الذكي" : "Wazen AI Financial Advisor"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "تحليل مالي فوري وشخصي مدعوم بالذكاء الاصطناعي"
                : "Personalized financial guidance powered by AI"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-xs"
          >
            {isOpen
              ? isAr
                ? "إخفاء"
                : "Collapse"
              : isAr
                ? "استشارة الذكاء الاصطناعي"
                : "Open Advisor"}
          </Button>
        </div>
      </div>

      {/* Collapsible content */}
      {isOpen ? (
        <div className="mt-5 space-y-5 wazen-enter">
          {/* Mode Switcher */}
          <div className="flex gap-2 border-b border-border/50 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("advice")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === "advice"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
              )}
            >
              {isAr ? "تحليل مالي شامل" : "Comprehensive Review"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
              )}
            >
              {isAr ? "محادثة مباشرة مع وازن" : "Ask a Question"}
            </button>
          </div>

          {activeTab === "advice" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((item, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={adviceMutation.isPending}
                    onClick={() => handleRequestAdvice(item.prompt)}
                    className="h-auto rounded-full px-3 py-1.5 text-xs font-normal hover:border-gold hover:text-gold"
                  >
                    <AiIcon className="size-3 text-gold me-1.5" strokeWidth={ICON_STROKE} />
                    {item.label}
                  </Button>
                ))}
              </div>

              {/* Loading State */}
              {adviceMutation.isPending ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-center">
                  <SpinnerIcon className="size-6 animate-spin text-gold" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {isAr
                      ? "جارٍ تحليل بياناتك المالية عبر الذكاء الاصطناعي..."
                      : "Analyzing your financial data with Wazen AI..."}
                  </p>
                </div>
              ) : null}

              {/* Error State */}
              {adviceMutation.isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                  <p className="font-semibold">
                    {isAr ? "تعذر إنشاء الاستشارة المالية" : "Unable to generate financial advice"}
                  </p>
                  <p className="mt-1">{adviceMutation.error.message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestAdvice(quickPrompts[0].prompt)}
                    className="mt-3 h-7 text-xs"
                  >
                    <RetryIcon className="size-3 me-1.5" strokeWidth={ICON_STROKE} />
                    {isAr ? "إعادة المحاولة" : "Retry"}
                  </Button>
                </div>
              ) : null}

              {/* Success Result */}
              {adviceMutation.isSuccess && adviceMutation.data ? (
                <div className="space-y-4 rounded-2xl border border-gold/30 bg-gold/5 p-4 sm:p-5 wazen-enter">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-gold" />
                    <h3 className="text-sm font-semibold sm:text-base">
                      {isAr ? "التوصية المالية المخصصة" : "Personalized Financial Assessment"}
                    </h3>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                    {adviceMutation.data.advice}
                  </p>

                  {adviceMutation.data.keyPoints && adviceMutation.data.keyPoints.length > 0 ? (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {isAr ? "الخطوات المقترحة" : "Key Actionable Takeaways"}
                      </p>
                      <ul className="space-y-1.5">
                        {adviceMutation.data.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {adviceMutation.data.disclaimer ? (
                    <p className="border-t border-border/50 pt-3 text-[0.7rem] text-muted-foreground italic">
                      {adviceMutation.data.disclaimer}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chat Thread */}
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4">
                {chatMessages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {isAr
                      ? "اطرح أي سؤال حول ميزانيتك، خطط التوفير، أو إدارة المصاريف في الكويت."
                      : "Ask any question regarding your budget, savings plans, or expense management."}
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-xl p-3 text-xs sm:text-sm leading-relaxed max-w-[85%]",
                        msg.role === "user"
                          ? "ms-auto bg-primary text-primary-foreground"
                          : "me-auto border border-border bg-card text-foreground",
                      )}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                {chatMutation.isPending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <SpinnerIcon className="size-3 animate-spin" />
                    <span>{isAr ? "وازِن يفكر..." : "Wazen AI is thinking..."}</span>
                  </div>
                ) : null}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={
                    isAr ? "اكتب سؤالك المالي هنا..." : "Type your financial question..."
                  }
                  className="wazen-field flex-1 text-xs sm:text-sm"
                  disabled={chatMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!customPrompt.trim() || chatMutation.isPending}
                  size="sm"
                >
                  {chatMutation.isPending ? (
                    <SpinnerIcon className="size-4 animate-spin" />
                  ) : isAr ? (
                    "إرسال"
                  ) : (
                    "Ask"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
