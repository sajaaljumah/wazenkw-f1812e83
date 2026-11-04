import { describe, expect, it } from "vitest";
import { buildAdultFinancialSummary, buildAdultSystemPrompt, isAdultChatStage } from "./adult-chat";
import type { Transaction } from "./finance";

const tx = (kind: Transaction["kind"], amount: number, category: string, occurred_on: string): Transaction => ({
  id: `${kind}-${amount}-${occurred_on}`,
  user_id: "u1",
  kind,
  category,
  merchant: null,
  amount,
  currency: "KWD",
  occurred_on,
  note: null,
  goal_id: null,
  created_at: occurred_on,
});

describe("adult AI assistant rules", () => {
  it("is offered to university students, employees, self-employed and parents only", () => {
    expect(["university_student", "employee", "self_employed", "parent"].every(isAdultChatStage)).toBe(true);
    expect(isAdultChatStage("child")).toBe(false);
    expect(isAdultChatStage("teenager")).toBe(false);
  });

  it("counts refunds as lower spending, not income", () => {
    const summary = buildAdultFinancialSummary({
      currency: "KWD",
      transactions: [tx("income", 1000, "salary", "2026-11-02"), tx("expense", 300, "food", "2026-11-03"), tx("refund", 50, "food", "2026-11-04")],
      goals: [],
      budget: null,
      recurring: [],
      assets: null,
      now: new Date(2026, 10, 10),
    });
    expect(summary.thisMonth.income).toBe(1000);
    expect(summary.thisMonth.expenses).toBe(250);
  });

  it("compares this month's budget with net spending", () => {
    const summary = buildAdultFinancialSummary({
      currency: "KWD",
      transactions: [tx("expense", 400, "food", "2026-11-03")],
      goals: [],
      budget: { id: "b", user_id: "u1", period_month: "2026-11-01", amount: 500, currency: "KWD" },
      recurring: [],
      assets: null,
      now: new Date(2026, 10, 10),
    });
    expect(summary.budget).toEqual({ amount: 500, spent: 400, remaining: 100, percentUsed: 80 });
  });

  it("forbids the AI from moving money or changing records", () => {
    const summary = buildAdultFinancialSummary({ currency: "KWD", transactions: [], goals: [], budget: null, recurring: [], assets: null });
    const prompt = buildAdultSystemPrompt({ firstName: "Mariam", lifeStage: "employee", language: "en", summary });
    expect(prompt).toContain("You cannot perform transactions, move money or change any record");
    expect(prompt).toContain("Never invent numbers");
  });
});
