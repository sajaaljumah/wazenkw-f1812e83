export type TransactionKind = "income" | "expense" | "saving" | "refund";
export type GoalKind = "goal" | "emergency_fund";
export type RecurringKind = "income" | "expense" | "saving";

export type Transaction = {
  id: string;
  user_id: string;
  kind: TransactionKind;
  category: string;
  merchant: string | null;
  amount: number;
  currency: string;
  occurred_on: string;
  note: string | null;
  goal_id: string | null;
  created_at: string;
  /** The family member the money was spent on, when it was not the account owner. */
  beneficiary_user_id?: string | null;
  /** True when a parent/guardian paid this on behalf of a child or teenager. */
  paid_by_parent?: boolean;
  /** True only when the parent chose to take it out of the child's own money. */
  deducted_from_child?: boolean;
  payment_method?: string | null;
  linked_transaction_id?: string | null;
};


export type Goal = {
  id: string;
  user_id: string;
  name: string;
  kind: GoalKind;
  target_amount: number;
  target_date: string | null;
  currency: string;
};

export type Budget = {
  id: string;
  user_id: string;
  period_month: string;
  amount: number;
  currency: string;
};

/** How often a recurring commitment repeats. */
export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export type RecurringItem = {
  id: string;
  user_id: string;
  kind: RecurringKind;
  name: string;
  category: string;
  amount: number;
  currency: string;
  day_of_month: number;
  active: boolean;
  frequency?: RecurringFrequency;
  merchant?: string | null;
  start_date?: string | null;
  ends_on?: string | null;
  note?: string | null;
};

export type RecurringStatus = "active" | "paused" | "ended" | "scheduled";

export function frequencyOf(item: RecurringItem): RecurringFrequency {
  return item.frequency ?? "monthly";
}

function startOfDay(date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The next date a recurring item is due, honouring its frequency, start date and
 * end date. Returns null once the commitment has ended.
 */
export function nextDueDate(item: RecurringItem, from = new Date()): Date | null {
  const today = startOfDay(from);
  const ends = parseDate(item.ends_on);
  if (ends && ends < today) return null;
  const start = parseDate(item.start_date) ?? today;
  const frequency = frequencyOf(item);

  let candidate: Date;
  if (frequency === "weekly") {
    candidate = new Date(start);
    while (candidate < today) candidate.setDate(candidate.getDate() + 7);
  } else {
    const step = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
    const anchor = start > today ? start : today;
    let monthIndex = anchor.getMonth();
    let year = anchor.getFullYear();
    if (frequency !== "monthly") {
      // Keep the cycle aligned to the start month.
      const monthsSinceStart =
        (anchor.getFullYear() - start.getFullYear()) * 12 + (anchor.getMonth() - start.getMonth());
      const cycles = Math.max(0, Math.ceil(monthsSinceStart / step));
      monthIndex = start.getMonth() + cycles * step;
      year = start.getFullYear();
    }
    const build = (y: number, m: number) => {
      const base = new Date(y, m, 1);
      const day = Math.min(item.day_of_month, daysInMonth(base.getFullYear(), base.getMonth()));
      return new Date(base.getFullYear(), base.getMonth(), day);
    };
    candidate = build(year, monthIndex);
    let guard = 0;
    while ((candidate < today || candidate < start) && guard < 60) {
      monthIndex += step;
      candidate = build(year, monthIndex);
      guard += 1;
    }
  }
  if (ends && candidate > ends) return null;
  return candidate;
}

export function recurringStatus(item: RecurringItem, from = new Date()): RecurringStatus {
  if (!item.active) return "paused";
  const today = startOfDay(from);
  const ends = parseDate(item.ends_on);
  if (ends && ends < today) return "ended";
  const start = parseDate(item.start_date);
  if (start && start > today) return "scheduled";
  return "active";
}

/** Total committed per calendar month, normalised across frequencies. */
export function monthlyEquivalent(item: RecurringItem): number {
  const amount = Number(item.amount) || 0;
  switch (frequencyOf(item)) {
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export function monthlyCommitments(items: RecurringItem[]): {
  expenses: number;
  income: number;
  savings: number;
} {
  let expenses = 0;
  let income = 0;
  let savings = 0;
  for (const item of items) {
    if (recurringStatus(item) !== "active") continue;
    const value = monthlyEquivalent(item);
    if (item.kind === "income") income += value;
    else if (item.kind === "saving") savings += value;
    else expenses += value;
  }
  return { expenses, income, savings };
}

const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR", "JOD", "TND"]);

export function formatMoney(amount: number, currency: string): string {
  const digits = THREE_DECIMAL_CURRENCIES.has(currency) ? 3 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}

/** Compact form for large headline numbers on small screens. */
export function formatAmount(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date);
}

export function formatToday(date = new Date(), locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOf(value: string): string {
  return value.slice(0, 7);
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

/** Handles 28/29/30/31-day months and leap years. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function firstOfMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export type Totals = {
  income: number;
  expenses: number;
  refunds: number;
  savings: number;
  net: number;
};

/** Refunds reduce net spending rather than counting as income. */
export function totalsFor(transactions: Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  let refunds = 0;
  let savings = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.kind === "income") income += amount;
    else if (t.kind === "expense") expenses += amount;
    else if (t.kind === "refund") refunds += amount;
    else if (t.kind === "saving") savings += amount;
  }
  const netExpenses = expenses - refunds;
  return { income, expenses: netExpenses, refunds, savings, net: income - netExpenses - savings };
}

export function inMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.occurred_on) === key);
}

/**
 * Money the user can actually spend right now: everything earned, minus what
 * was really spent, minus what has been moved into savings, goals or the
 * emergency fund. Savings balances are never counted as available money.
 */
export function availableMoney(transactions: Transaction[]): number {
  return totalsFor(transactions).net;
}

export function savedForGoal(transactions: Transaction[], goalId: string): number {
  return transactions
    .filter((t) => t.kind === "saving" && t.goal_id === goalId)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
}

export type CategorySlice = { category: string; amount: number };

export function spendingByCategory(transactions: Transaction[]): CategorySlice[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense" && t.kind !== "refund") continue;
    const delta = (Number(t.amount) || 0) * (t.kind === "refund" ? -1 : 1);
    map.set(t.category, (map.get(t.category) ?? 0) + delta);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .filter((slice) => slice.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export type MonthlyPoint = { label: string; income: number; expenses: number };

export function monthlySeries(transactions: Transaction[], months = 6): MonthlyPoint[] {
  const today = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const totals = totalsFor(inMonth(transactions, monthKey(date)));
    points.push({
      label: monthLabel(date),
      income: round(totals.income),
      expenses: round(Math.max(totals.expenses, 0)),
    });
  }
  return points;
}

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export type UpcomingEntry = {
  id: string;
  name: string;
  category: string;
  kind: RecurringKind;
  amount: number;
  currency: string;
  date: Date;
  frequency: RecurringFrequency;
};

/** Next occurrence of each active recurring item within the given horizon. */
export function upcomingCashFlow(items: RecurringItem[], horizonDays = 45): UpcomingEntry[] {
  const today = startOfDay();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + horizonDays);

  const entries: UpcomingEntry[] = [];
  for (const item of items) {
    if (recurringStatus(item, today) !== "active") continue;
    const date = nextDueDate(item, today);
    if (!date || date > horizon) continue;
    entries.push({
      id: item.id,
      name: item.name,
      category: item.category,
      kind: item.kind,
      amount: Number(item.amount) || 0,
      currency: item.currency,
      date,
      frequency: frequencyOf(item),
    });
  }
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  income: "Income",
  expense: "Expense",
  saving: "Saving",
  refund: "Refund",
};
