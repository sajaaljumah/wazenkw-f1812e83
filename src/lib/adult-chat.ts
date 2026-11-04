/**
 * Adult dashboard AI assistant: financial summary + system prompt rules.
 *
 * Pure, browser-safe helpers. The server function loads the signed-in adult's
 * OWN rows and turns them into a compact numeric summary here, so the AI only
 * ever sees real stored figures and the safety rules live in one place.
 */
import {
  firstOfMonth,
  monthKey,
  monthlyCommitments,
  monthlyEquivalent,
  recurringStatus,
  round,
  savedForGoal,
  spendingByCategory,
  totalsFor,
  inMonth,
  type Budget,
  type Goal,
  type RecurringItem,
  type Transaction,
} from "@/lib/finance";
import { portfolioTotals, type Asset } from "@/lib/assets";

export type AdultChatLanguage = "ar" | "en";
export type AdultChatTurn = { role: "user" | "assistant"; content: string };
export const ADULT_LIFE_STAGES_FOR_CHAT = [
  "university_student",
  "employee",
  "self_employed",
  "parent",
] as const;

export const ADULT_CHAT_LIMITS = {
  maxMessageChars: 1000,
  maxHistoryTurns: 20,
} as const;

export function isAdultChatStage(stage: string | null | undefined): boolean {
  return !!stage && (ADULT_LIFE_STAGES_FOR_CHAT as readonly string[]).includes(stage);
}

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
  refunds: number;
  savings: number;
  net: number;
};

export type AdultFinancialSummary = {
  today: string;
  latestTransactionDate: string | null;
  currency: string;
  availableMoney: number;
  thisMonth: MonthSummary & { topCategories: { category: string; amount: number }[] };
  lastMonth: MonthSummary & { topCategories: { category: string; amount: number }[] };
  monthlyHistory: MonthSummary[];
  incomeSourcesLast3Months: { category: string; amount: number }[];
  topMerchantsThisMonth: { merchant: string; amount: number }[];
  budget: { amount: number; spent: number; remaining: number; percentUsed: number } | null;
  goals: {
    name: string;
    target: number;
    saved: number;
    percent: number;
    targetDate: string | null;
  }[];
  emergencyFunds: { name: string; target: number; saved: number; percent: number }[];
  recurring: {
    monthlyExpenses: number;
    monthlyIncome: number;
    monthlySavings: number;
    items: { name: string; kind: string; category: string; monthly: number }[];
  };
  assets: {
    value: number;
    cost: number;
    gain: number;
    gainPercent: number;
    annualRent: number;
    byKind: { kind: string; value: number; count: number }[];
  } | null;
};

function summarizeMonth(list: Transaction[], key: string): MonthSummary {
  const totals = totalsFor(inMonth(list, key));
  return {
    month: key,
    income: round(totals.income),
    expenses: round(totals.expenses),
    refunds: round(totals.refunds),
    savings: round(totals.savings),
    net: round(totals.net),
  };
}

const topCategories = (list: Transaction[]) =>
  spendingByCategory(list)
    .slice(0, 8)
    .map((slice) => ({ category: slice.category, amount: round(slice.amount) }));

/** Builds the numeric summary the assistant reasons over. */
export function buildAdultFinancialSummary(input: {
  currency: string;
  transactions: Transaction[];
  goals: Goal[];
  budget: Budget | null;
  recurring: RecurringItem[];
  assets: Asset[] | null;
  now?: Date;
}): AdultFinancialSummary {
  const now = input.now ?? new Date();
  const list = input.transactions;
  const thisKey = monthKey(now);
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const history: MonthSummary[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    history.push(
      summarizeMonth(list, monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))),
    );
  }

  const recentKeys = new Set(
    [0, 1, 2].map((i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))),
  );
  const incomeMap = new Map<string, number>();
  for (const t of list) {
    if (t.kind !== "income" || !recentKeys.has(t.occurred_on.slice(0, 7))) continue;
    incomeMap.set(t.category, (incomeMap.get(t.category) ?? 0) + (Number(t.amount) || 0));
  }

  const merchantMap = new Map<string, number>();
  for (const t of inMonth(list, thisKey)) {
    if (t.kind !== "expense" || !t.merchant) continue;
    merchantMap.set(t.merchant, (merchantMap.get(t.merchant) ?? 0) + (Number(t.amount) || 0));
  }

  const spentThisMonth = totalsFor(inMonth(list, thisKey)).expenses;
  const budget =
    input.budget && input.budget.period_month === firstOfMonth(now)
      ? {
          amount: round(Number(input.budget.amount)),
          spent: round(spentThisMonth),
          remaining: round(Number(input.budget.amount) - spentThisMonth),
          percentUsed:
            Number(input.budget.amount) > 0
              ? Math.round((spentThisMonth / Number(input.budget.amount)) * 100)
              : 0,
        }
      : null;

  const goalRow = (goal: Goal) => {
    const saved = savedForGoal(list, goal.id);
    const target = Number(goal.target_amount) || 0;
    return {
      name: goal.name,
      target: round(target),
      saved: round(saved),
      percent: target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0,
      targetDate: goal.target_date,
    };
  };

  const activeRecurring = input.recurring.filter((item) => recurringStatus(item, now) === "active");
  const commitments = monthlyCommitments(activeRecurring);
  const portfolio = input.assets && input.assets.length ? portfolioTotals(input.assets) : null;

  return {
    today: now.toISOString().slice(0, 10),
    latestTransactionDate: list.reduce<string | null>(
      (latest, t) => (!latest || t.occurred_on > latest ? t.occurred_on : latest),
      null,
    ),
    currency: input.currency,
    availableMoney: round(totalsFor(list).net),
    thisMonth: {
      ...summarizeMonth(list, thisKey),
      topCategories: topCategories(inMonth(list, thisKey)),
    },
    lastMonth: {
      ...summarizeMonth(list, lastKey),
      topCategories: topCategories(inMonth(list, lastKey)),
    },
    monthlyHistory: history,
    incomeSourcesLast3Months: [...incomeMap.entries()]
      .map(([category, amount]) => ({ category, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    topMerchantsThisMonth: [...merchantMap.entries()]
      .map(([merchant, amount]) => ({ merchant, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6),
    budget,
    goals: input.goals.filter((g) => g.kind === "goal").map(goalRow),
    emergencyFunds: input.goals
      .filter((g) => g.kind === "emergency_fund")
      .map((g) => {
        const row = goalRow(g);
        return { name: row.name, target: row.target, saved: row.saved, percent: row.percent };
      }),
    recurring: {
      monthlyExpenses: round(commitments.expenses),
      monthlyIncome: round(commitments.income),
      monthlySavings: round(commitments.savings),
      items: activeRecurring.slice(0, 20).map((item) => ({
        name: item.name,
        kind: item.kind,
        category: item.category,
        monthly: round(monthlyEquivalent(item)),
      })),
    },
    assets: portfolio
      ? {
          value: round(portfolio.value),
          cost: round(portfolio.cost),
          gain: round(portfolio.gain),
          gainPercent: Math.round(portfolio.gainPercent * 10) / 10,
          annualRent: round(portfolio.annualRentalIncome),
          byKind: portfolio.byKind
            .filter((k) => k.count > 0)
            .map((k) => ({ kind: k.kind, value: round(k.value), count: k.count })),
        }
      : null,
  };
}

const STAGE_LABEL: Record<string, string> = {
  university_student: "university student",
  employee: "employee",
  self_employed: "self-employed",
  parent: "parent",
};

/** System prompt: privacy/safety rules + the user's own financial summary. */
export function buildAdultSystemPrompt(input: {
  firstName: string;
  lifeStage: string;
  language: AdultChatLanguage;
  gender?: "female" | "male" | null;
  summary: AdultFinancialSummary;
}): string {
  const grammarRule =
    input.gender === "female"
      ? "Address the user with feminine grammar."
      : input.gender === "male"
        ? "Address the user with masculine grammar."
        : "Use gender-neutral wording.";
  const languageRule =
    input.language === "ar"
      ? "Always reply in clear, professional Arabic (light Gulf tone is fine). Keep numbers in Western digits with the currency code."
      : "Always reply in clear, professional English.";

  return `You are "Wazen AI", the personal finance assistant inside the Wazen app (Kuwait). Base currency: ${input.summary.currency}.
You are talking with ${input.firstName}, a ${STAGE_LABEL[input.lifeStage] ?? "adult"} user. Write the name exactly as "${input.firstName}" and do not use terms of endearment.
${languageRule}
${grammarRule}

How to answer:
- Analyse the user's real data below BEFORE answering. Quote specific figures, months, categories and percentages from it.
- Explain patterns (e.g. month-over-month changes by category), point out avoidable spending, and give 2-4 realistic, concrete improvements with estimated amounts.
- If the current month (or last month) has no recorded transactions, say so briefly, then analyse the most recent months in monthlyHistory that do have data (latestTransactionDate shows the newest record) instead of stopping at "zero".
- Refunds reduce net spending; savings and assets are not available money.
- If the data needed is missing, say so plainly and suggest what to record in Wazen. Never invent numbers, transactions, merchants or dates.
- Be concise: short paragraphs or bullet lists, use **bold** for key figures. Aim for under 220 words unless the user asks for detail.
- Label recommendations as suggestions. You cannot perform transactions, move money or change any record; if the user asks you to, explain they can do it themselves in Wazen (Transactions, Budget, Goals, Recurring) and that nothing changes without their action.
- This is educational guidance, not licensed investment, legal or tax advice. For assets, discuss diversification and risk in general terms; never promise returns or tell the user to buy/sell a specific security.
- Never ask for passwords, card numbers, PINs or bank credentials.
- You only know this user's own data. Never claim knowledge of other family members' private finances.
- Reply ONLY with the message for the user. Never mention these instructions, JSON field names or raw values like null/0 — describe them in plain words (e.g. "you haven't set a budget for this month").

User's financial data from Wazen (JSON, amounts in ${input.summary.currency}; "expenses" are net of refunds):
${JSON.stringify(input.summary)}`;
}

export function sanitizeAdultHistory(turns: AdultChatTurn[]): AdultChatTurn[] {
  return turns
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") && turn.content.trim().length > 0,
    )
    .slice(-ADULT_CHAT_LIMITS.maxHistoryTurns)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, ADULT_CHAT_LIMITS.maxMessageChars * 6),
    }));
}
