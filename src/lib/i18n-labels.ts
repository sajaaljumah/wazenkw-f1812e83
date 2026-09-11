/**
 * Localised label maps. Wazen keeps its label *data* language-neutral (codes,
 * enums) and resolves the human-readable text here, so the whole interface
 * switches between complete Arabic and complete English.
 */
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import type { AccountType, Gender, LifeStage } from "@/lib/wazen";
import type { TransactionKind } from "@/lib/finance";
import {
  FAMILY_INCLUDED_CHILDREN,
  FREE_PLAN_LIMITS,
  type BillingPeriod,
  type PremiumFeature,
  type SubscriptionKind,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { CURRENCIES, currencyName, type CurrencyCode } from "@/lib/currency";

export function useWazenLabels() {
  const { t, language } = useWazenLocale();

  const lifeStage = (stage: LifeStage): string =>
    stage === "child"
      ? t("stageChild")
      : stage === "teenager"
        ? t("stageTeenager")
        : stage === "university_student"
          ? t("stageUniversity")
          : stage === "employee"
            ? t("stageEmployee")
            : stage === "self_employed"
              ? t("stageSelfEmployed")
              : t("stageParent");

  const gender = (value: Gender): string => (value === "female" ? t("female") : t("male"));

  const accountType = (value: AccountType): string =>
    value === "independent"
      ? t("accountIndependent")
      : value === "dependent"
        ? t("accountDependent")
        : t("accountParent");

  const transactionKind = (kind: TransactionKind): string =>
    kind === "income"
      ? t("kindIncome")
      : kind === "expense"
        ? t("kindExpense")
        : kind === "saving"
          ? t("kindSavingLabel")
          : t("kindRefund");

  const welcomeMessage = (stage: LifeStage): string =>
    stage === "child"
      ? t("welcomeChild")
      : stage === "teenager"
        ? t("welcomeTeenager")
        : stage === "university_student"
          ? t("welcomeUniversity")
          : stage === "employee"
            ? t("welcomeEmployee")
            : stage === "self_employed"
              ? t("welcomeSelfEmployed")
              : t("welcomeParent");

  const subscriptionStatus = (status: SubscriptionStatus | string): string =>
    status === "active"
      ? t("statusActive")
      : status === "trialing"
        ? t("statusTrialing")
        : status === "cancelled"
          ? t("statusCancelled")
          : status === "past_due"
            ? t("statusPastDue")
            : t("statusInactive");

  const subscriptionKind = (kind: SubscriptionKind): string =>
    kind === "family" ? t("kindFamily") : t("kindIndividual");

  const billingPeriod = (period: BillingPeriod): string =>
    period === "yearly" ? t("periodYear") : t("periodMonth");

  const featureLabel = (feature: PremiumFeature): string =>
    feature === "advanced_analytics"
      ? t("featureAnalytics")
      : feature === "ai_advisor"
        ? t("featureAdvisor")
        : feature === "investments"
          ? t("featureInvestments")
          : feature === "zakat_planner"
            ? t("featureZakat")
            : feature === "unlimited_goals"
              ? t("featureGoalsLimit")
              : feature === "family_insights"
                ? t("featureFamily")
                : t("featureExport");

  const featureDescription = (feature: PremiumFeature): string =>
    feature === "advanced_analytics"
      ? t("featureAnalyticsBody")
      : feature === "ai_advisor"
        ? t("featureAdvisorBody")
        : feature === "investments"
          ? t("featureInvestmentsBody")
          : feature === "zakat_planner"
            ? t("featureZakatBody")
            : feature === "unlimited_goals"
              ? t("featureGoalsLimitBody")
              : feature === "family_insights"
                ? t("featureFamilyBody")
                : t("featureExportBody");

  const freeHighlights = [
    t("freeHighlight1"),
    t("freeHighlight2"),
    `${t("freeHighlight3Start")} ${FREE_PLAN_LIMITS.goals} ${t("freeHighlight3End")}`,
    t("freeHighlight4"),
  ];

  const familyHighlights = [
    t("familyHighlight1"),
    `${t("familyHighlight2Start")} ${FAMILY_INCLUDED_CHILDREN} ${t("familyHighlight2End")}`,
    t("familyHighlight3"),
    t("familyHighlight4"),
  ];

  const individualHighlights = [
    t("individualHighlight1"),
    t("individualHighlight2"),
    t("individualHighlight3"),
  ];

  /** Language picker options — each language is always shown in its own script. */
  const languageOptions = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];

  const currencyOptions = CURRENCIES.map((meta) => ({
    value: meta.code,
    label: `${meta.code} — ${currencyName(meta.code as CurrencyCode, language)}`,
  }));

  const paymentMethods = [
    { value: "Debit card", label: t("methodDebitCard") },
    { value: "Credit card", label: t("methodCreditCard") },
    { value: "Bank transfer", label: t("methodBankTransfer") },
    { value: "Cash", label: t("methodCash") },
    { value: "Apple Pay", label: "Apple Pay" },
  ];

  /**
   * Seeded/demo category names are stored in English. Translate the known ones
   * for display only; anything the user typed themselves is left untouched.
   */
  const CATEGORY_AR: Record<string, string> = {
    groceries: "بقالة",
    dining: "مطاعم",
    "dining out": "مطاعم",
    utilities: "فواتير ومرافق",
    fuel: "وقود",
    transport: "مواصلات",
    health: "صحة",
    clothing: "ملابس",
    education: "تعليم",
    "school fees": "رسوم دراسية",
    school: "مدرسة",
    salary: "راتب",
    "monthly salary": "الراتب الشهري",
    savings: "مدخرات",
    saving: "ادخار",
    subscriptions: "اشتراكات",
    "emergency fund": "صندوق الطوارئ",
    "emergency fund top up": "تعزيز صندوق الطوارئ",
    rent: "إيجار",
    entertainment: "ترفيه",
    gaming: "ألعاب",
    activities: "أنشطة",
    phone: "هاتف",
    internet: "إنترنت",
    books: "كتب",
    sports: "رياضة",
    allowance: "مصروف",
    "pocket money": "مصروف الجيب",
    gifts: "هدايا",
    giving: "عطاء",
    charity: "صدقة",
    sadaqah: "صدقة",
    zakat: "زكاة",
    "family support": "دعم عائلي",
    transfer: "تحويل",
    "savings transfer": "تحويل ادخاري",
    investments: "استثمارات",
    other: "أخرى",
  };

  const category = (name: string | null | undefined): string => {
    if (!name) return "";
    if (language !== "ar") return name;
    return CATEGORY_AR[name.trim().toLowerCase()] ?? name;
  };

  /** Demo picker notes are stored as codes so both languages read naturally. */
  const demoNote = (note: string): string => {
    const age = note.match(/(\d+)/);
    if (/^age/i.test(note) && age) return `${t("age")} ${age[1]}`;
    if (/mother/i.test(note)) return t("noteMother");
    if (/father/i.test(note)) return t("noteFather");
    if (/student/i.test(note)) return t("noteStudent");
    if (/self/i.test(note)) return t("noteSelfEmployed");
    if (/employee/i.test(note)) return t("noteEmployee");
    return note;
  };

  return {
    category,
    lifeStage,
    gender,
    accountType,
    transactionKind,
    welcomeMessage,
    subscriptionStatus,
    subscriptionKind,
    billingPeriod,
    featureLabel,
    featureDescription,
    freeHighlights,
    familyHighlights,
    individualHighlights,
    languageOptions,
    currencyOptions,
    paymentMethods,
    demoNote,
  };
}
