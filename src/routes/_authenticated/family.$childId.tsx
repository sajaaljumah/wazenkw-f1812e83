import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import {
  AddIcon,
  DeleteIcon,
  FamilyIcon,
  ForwardIcon,
  ICON_STROKE,
  LockedIcon,
  ProfileIcon,
  SpinnerIcon,
} from "@/components/wazen/icons";
import { Button } from "@/components/ui/button";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { calculateAge } from "@/lib/wazen";
import { formatDate, formatMoney } from "@/lib/finance";
import {
  addManagedChildTransactionFn,
  deleteManagedChildTransactionFn,
  getManagedChildFn,
  updateManagedChildFn,
  type ManagedChild,
} from "@/lib/child-management.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/family/$childId")({
  head: () => ({
    meta: [
      { title: "Manage child account — Wazen" },
      {
        name: "description",
        content: "Parents manage a linked child's account details and money in Wazen.",
      },
      { property: "og:title", content: "Manage child account — Wazen" },
      {
        property: "og:description",
        content: "Edit a linked child's login details and manage their spending.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageChildPage,
});

type Text = { en: string; ar: string };
const C = {
  back: { en: "Back to Settings", ar: "العودة إلى الإعدادات" },
  linked: { en: "Linked to you", ar: "مرتبط بحسابك" },
  asMother: { en: "You are the mother", ar: "أنتِ الأم" },
  asFather: { en: "You are the father", ar: "أنت الأب" },
  asGuardian: { en: "You are the guardian", ar: "ولي الأمر" },
  demoTitle: { en: "Demo account — view only", ar: "حساب تجريبي — للعرض فقط" },
  demoBody: {
    en: "Demo accounts are shared for presentations, so their details can't be changed. Create your own account and add your children to manage everything.",
    ar: "الحسابات التجريبية مشتركة للعرض، لذلك لا يمكن تعديل بياناتها. أنشئ حسابك الخاص وأضف أطفالك لتتحكم بكل شيء.",
  },
  account: { en: "Account details", ar: "بيانات الحساب" },
  accountHint: {
    en: "Change your child's name, login email, password and app language.",
    ar: "عدّل اسم طفلك وبريد الدخول وكلمة المرور ولغة التطبيق.",
  },
  name: { en: "Name", ar: "الاسم" },
  email: { en: "Login email", ar: "بريد الدخول" },
  password: { en: "New password", ar: "كلمة مرور جديدة" },
  passwordHint: {
    en: "Leave empty to keep the current password. At least 8 characters.",
    ar: "اتركها فارغة للإبقاء على كلمة المرور الحالية. 8 أحرف على الأقل.",
  },
  language: { en: "App language", ar: "لغة التطبيق" },
  dob: { en: "Date of birth", ar: "تاريخ الميلاد" },
  gender: { en: "Gender", ar: "الجنس" },
  fixed: { en: "Set when the account was created", ar: "يُحدَّد عند إنشاء الحساب" },
  save: { en: "Save changes", ar: "حفظ التغييرات" },
  saved: { en: "Child account updated", ar: "تم تحديث حساب الطفل" },
  money: { en: "Money & spending", ar: "المال والمصروفات" },
  moneyHint: {
    en: "Add allowance or spending to your child's account, or remove a wrong entry.",
    ar: "أضف مصروفاً أو إنفاقاً إلى حساب طفلك، أو احذف قيداً خاطئاً.",
  },
  kind: { en: "Type", ar: "النوع" },
  expense: { en: "Expense", ar: "مصروف" },
  income: { en: "Allowance / income", ar: "مصروف جيب / دخل" },
  amount: { en: "Amount", ar: "المبلغ" },
  category: { en: "Category", ar: "الفئة" },
  merchant: { en: "Place (optional)", ar: "المكان (اختياري)" },
  date: { en: "Date", ar: "التاريخ" },
  add: { en: "Add", ar: "إضافة" },
  added: { en: "Transaction added", ar: "تمت إضافة العملية" },
  removed: { en: "Transaction removed", ar: "تم حذف العملية" },
  noTx: { en: "No transactions yet.", ar: "لا توجد عمليات بعد." },
  recent: { en: "Recent transactions", ar: "آخر العمليات" },
  goals: { en: "Goals", ar: "الأهداف" },
  noGoals: { en: "No goals yet.", ar: "لا توجد أهداف بعد." },
  failed: { en: "Something went wrong. Please try again.", ar: "حدث خطأ. حاول مرة أخرى." },
  emailTaken: {
    en: "This email is already used by another account.",
    ar: "هذا البريد مستخدم في حساب آخر.",
  },
  locked: { en: "Demo accounts can't be changed.", ar: "لا يمكن تعديل الحسابات التجريبية." },
  notFound: { en: "This child isn't linked to your account.", ar: "هذا الطفل غير مرتبط بحسابك." },
  female: { en: "Female", ar: "أنثى" },
  male: { en: "Male", ar: "ذكر" },
  years: { en: "yrs", ar: "سنة" },
} satisfies Record<string, Text>;

const CHILD_CATEGORIES = [
  "snacks",
  "school",
  "toys",
  "games",
  "books",
  "clothes",
  "gifts",
  "transport",
  "allowance",
  "pocket money",
  "charity",
  "other",
];

function ManageChildPage() {
  const { childId } = Route.useParams();
  const { language } = useWazenLocale();
  const t = (text: Text) => text[language];
  const labels = useWazenLabels();
  const queryClient = useQueryClient();
  const fetchChild = useServerFn(getManagedChildFn);
  const updateChild = useServerFn(updateManagedChildFn);
  const addTx = useServerFn(addManagedChildTransactionFn);
  const deleteTx = useServerFn(deleteManagedChildTransactionFn);

  const query = useQuery({
    queryKey: ["managed-child", childId],
    queryFn: () => fetchChild({ data: { childId } }),
    retry: false,
  });

  const errorText = (err: unknown) => {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("DEMO_LOCKED")) return t(C.locked);
    if (message.includes("EMAIL_TAKEN")) return t(C.emailTaken);
    return t(C.failed);
  };

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["managed-child", childId] }),
      queryClient.invalidateQueries({ queryKey: ["family-summary"] }),
    ]);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 wazen-enter">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ForwardIcon className="size-4 rotate-180 rtl:rotate-0" strokeWidth={ICON_STROKE} />
          {t(C.back)}
        </Link>

        {query.isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError || !query.data ? (
          <p className="rounded-2xl border border-border bg-secondary/40 p-6 text-sm">
            {t(C.notFound)}
          </p>
        ) : (
          <ChildManager
            child={query.data}
            t={t}
            labels={labels}
            onSave={async (values) => {
              try {
                await updateChild({ data: { childId, ...values } });
                toast.success(t(C.saved));
                await refresh();
                return true;
              } catch (err) {
                toast.error(errorText(err));
                return false;
              }
            }}
            onAdd={async (values) => {
              try {
                await addTx({ data: { childId, ...values } });
                toast.success(t(C.added));
                await refresh();
                return true;
              } catch (err) {
                toast.error(errorText(err));
                return false;
              }
            }}
            onDelete={async (transactionId) => {
              try {
                await deleteTx({ data: { childId, transactionId } });
                toast.success(t(C.removed));
                await refresh();
              } catch (err) {
                toast.error(errorText(err));
              }
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

type Labels = ReturnType<typeof useWazenLabels>;

function ChildManager({
  child,
  t,
  labels,
  onSave,
  onAdd,
  onDelete,
}: {
  child: ManagedChild;
  t: (text: Text) => string;
  labels: Labels;
  onSave: (values: {
    fullName: string;
    email: string;
    language: "ar" | "en";
    password?: string;
  }) => Promise<boolean>;
  onAdd: (values: {
    kind: "expense" | "income";
    amount: number;
    category: string;
    merchant: string | null;
    note: string | null;
    occurredOn: string;
  }) => Promise<boolean>;
  onDelete: (transactionId: string) => Promise<void>;
}) {
  const locked = child.locked;
  const [fullName, setFullName] = useState(child.fullName);
  const [email, setEmail] = useState(child.email ?? "");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"ar" | "en">(child.language === "en" ? "en" : "ar");
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CHILD_CATEGORIES[0]!);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setFullName(child.fullName);
    setEmail(child.email ?? "");
    setLang(child.language === "en" ? "en" : "ar");
  }, [child.fullName, child.email, child.language]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (locked || saving) return;
    setSaving(true);
    const ok = await onSave({
      fullName: fullName.trim(),
      email: email.trim(),
      language: lang,
      ...(password ? { password } : {}),
    });
    if (ok) setPassword("");
    setSaving(false);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (locked || adding || !Number.isFinite(value) || value <= 0) return;
    setAdding(true);
    const ok = await onAdd({
      kind,
      amount: value,
      category,
      merchant: merchant.trim() || null,
      note: null,
      occurredOn: date,
    });
    if (ok) {
      setAmount("");
      setMerchant("");
    }
    setAdding(false);
  }

  const age = calculateAge(child.dateOfBirth);
  const fieldClass = "wazen-field w-full disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <header className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {child.fullName.charAt(0)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl sm:text-3xl">{child.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {labels.lifeStage(child.lifeStage as Parameters<Labels["lifeStage"]>[0])} · {age}{" "}
            {t(C.years)}
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]">
              <FamilyIcon className="size-3" strokeWidth={ICON_STROKE} />
              {child.relationship === "mother"
                ? t(C.asMother)
                : child.relationship === "father"
                  ? t(C.asFather)
                  : child.relationship === "guardian"
                    ? t(C.asGuardian)
                    : t(C.linked)}
            </span>
          </p>
        </div>
      </header>

      {locked ? (
        <div
          role="note"
          className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-4"
        >
          <LockedIcon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={ICON_STROKE} />
          <div>
            <p className="text-sm font-semibold">{t(C.demoTitle)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(C.demoBody)}</p>
          </div>
        </div>
      ) : null}

      <section className="wazen-card space-y-5">
        <div className="flex items-start gap-2">
          <ProfileIcon className="mt-1 size-5 text-primary" strokeWidth={ICON_STROKE} />
          <div>
            <h2 className="text-xl">{t(C.account)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t(C.accountHint)}</p>
          </div>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span>{t(C.name)}</span>
            <input
              className={fieldClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={locked}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span>{t(C.email)}</span>
            <input
              className={fieldClass}
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={locked}
              required
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span>{t(C.password)}</span>
            <input
              className={fieldClass}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={locked}
              minLength={8}
              placeholder={locked ? "••••••••" : ""}
            />
            <span className="block text-[11px] text-muted-foreground">{t(C.passwordHint)}</span>
          </label>
          <label className="space-y-1.5 text-sm">
            <span>{t(C.language)}</span>
            <select
              className={fieldClass}
              value={lang}
              onChange={(e) => setLang(e.target.value as "ar" | "en")}
              disabled={locked}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <div className="space-y-1.5 text-sm">
            <span>{t(C.dob)}</span>
            <p className="wazen-field w-full opacity-60">{formatDate(child.dateOfBirth)}</p>
            <span className="block text-[11px] text-muted-foreground">{t(C.fixed)}</span>
          </div>
          <div className="space-y-1.5 text-sm">
            <span>{t(C.gender)}</span>
            <p className="wazen-field w-full opacity-60">
              {child.gender === "female" ? t(C.female) : t(C.male)}
            </p>
            <span className="block text-[11px] text-muted-foreground">{t(C.fixed)}</span>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={locked || saving} className="gap-2">
              {saving ? (
                <SpinnerIcon className="size-4 animate-spin" />
              ) : locked ? (
                <LockedIcon className="size-4" strokeWidth={ICON_STROKE} />
              ) : null}
              {t(C.save)}
            </Button>
          </div>
        </form>
      </section>

      <section className="wazen-card space-y-5">
        <div>
          <h2 className="text-xl">{t(C.money)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t(C.moneyHint)}</p>
        </div>

        <form onSubmit={add} className="grid gap-3 sm:grid-cols-6 sm:items-end">
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span>{t(C.kind)}</span>
            <select
              className={fieldClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as "expense" | "income")}
              disabled={locked}
            >
              <option value="expense">{t(C.expense)}</option>
              <option value="income">{t(C.income)}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span>
              {t(C.amount)} ({child.currency})
            </span>
            <input
              className={fieldClass}
              type="number"
              inputMode="decimal"
              min="0.001"
              step="0.001"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={locked}
              required
            />
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span>{t(C.category)}</span>
            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={locked}
            >
              {CHILD_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {labels.category(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-3">
            <span>{t(C.merchant)}</span>
            <input
              className={fieldClass}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              disabled={locked}
              maxLength={80}
            />
          </label>
          <label className="space-y-1.5 text-sm sm:col-span-2">
            <span>{t(C.date)}</span>
            <input
              className={fieldClass}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={locked}
              required
            />
          </label>
          <Button type="submit" disabled={locked || adding} className="gap-1.5 sm:col-span-1">
            {adding ? (
              <SpinnerIcon className="size-4 animate-spin" />
            ) : (
              <AddIcon className="size-4" strokeWidth={ICON_STROKE} />
            )}
            {t(C.add)}
          </Button>
        </form>

        <div>
          <h3 className="text-sm font-semibold">{t(C.recent)}</h3>
          {child.transactions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t(C.noTx)}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {child.transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {labels.category(tx.category)}
                      {tx.merchant ? (
                        <span className="text-muted-foreground"> · {tx.merchant}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.occurred_on)} ·{" "}
                      {labels.transactionKind(tx.kind as Parameters<Labels["transactionKind"]>[0])}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm tabular-nums",
                      tx.kind === "income" || tx.kind === "refund"
                        ? "text-positive"
                        : "text-foreground",
                    )}
                    dir="ltr"
                  >
                    {tx.kind === "expense" ? "−" : "+"}
                    {formatMoney(tx.amount, tx.currency)}
                  </span>
                  {!locked ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setDeleting(tx.id);
                        await onDelete(tx.id);
                        setDeleting(null);
                      }}
                      disabled={deleting === tx.id}
                      aria-label={`${t(C.removed)}: ${labels.category(tx.category)}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      {deleting === tx.id ? (
                        <SpinnerIcon className="size-4 animate-spin" />
                      ) : (
                        <DeleteIcon className="size-4" strokeWidth={ICON_STROKE} />
                      )}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t(C.goals)}</h3>
          {child.goals.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t(C.noGoals)}</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {child.goals.map((goal) => (
                <li key={goal.id} className="rounded-full border border-border px-3 py-1.5 text-xs">
                  {goal.name} ·{" "}
                  <span dir="ltr">{formatMoney(goal.target_amount, child.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
