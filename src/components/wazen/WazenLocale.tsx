import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useProfile } from "@/hooks/use-wazen-auth";

export type WazenLanguage = "en" | "ar";

/** Arabic is Wazen's default language; English is available in Settings. */
export const DEFAULT_LANGUAGE: WazenLanguage = "ar";
const STORAGE_KEY = "wazen.language";

const COPY = {
  en: {
    // navigation & shell
    overview: "Overview",
    plan: "Plan",
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign out",
    language: "Language",
    english: "English",
    arabic: "العربية",

    // dashboard
    quickEntry: "Quick entry",
    addIncome: "Add income",
    addExpense: "Add expense",
    addSaving: "Add saving",
    addGoal: "Add goal",
    availableMoney: "Available money",
    incomeMonth: "Income this month",
    expensesMonth: "Expenses this month",
    totalSavings: "Total savings",
    monthlyBudget: "Monthly budget",
    emergencyFund: "Emergency fund",
    spendingCategory: "Spending by category",
    incomeExpenses: "Income vs expenses",
    savingsGoals: "Savings goals",
    upcoming: "Upcoming income & payments",
    recent: "Recent transactions",
    familySummary: "Family summary",
    loadingFamily: "Loading your family…",
    noFamily: "No linked family members",
    noFamilyDescription: "Children and teenagers linked to your account will be summarised here.",
    available: "Available",
    saved: "Saved",
    spent: "Spent",
    all: "All",
    moneyIn: "Money in",
    spending: "Spending",
    saving: "Saving",
    noTransactions: "No transactions yet",
    nothingHere: "Nothing here yet",
    noTransactionsDescription: "Use quick entry to record your first income or expense.",
    noScheduled: "Nothing scheduled",
    noScheduledDescription: "Recurring income, bills and saving transfers will be listed here.",
    noGoals: "No goals yet",
    noGoalsDescription: "Create a goal and every saving transfer will move the bar forward.",
    noBudget: "No budget set for this month",
    budgetDescription: "Once a monthly budget exists, your remaining amount appears here.",
    noEmergency: "No emergency fund yet",
    emergencyDescription: "Add an emergency-fund goal to start tracking your safety net.",
    income: "Income",
    expense: "Expense",
    refund: "Refund",

    // landing
    landingEyebrow: "Personal finance & financial education",
    landingTagline: "Balance your money with quiet confidence.",
    landingBody:
      "Wazen brings clarity to saving, spending and learning — for you and for the whole family.",
    createAccount: "Create your account",
    exploreDemo: "Explore a demo account",
    signIn: "Sign in",
    pillarStagesTitle: "Built for every life stage",
    pillarStagesBody:
      "Children, teenagers, university students, employees and the self-employed each get an experience that fits.",
    pillarPrivacyTitle: "Private by design",
    pillarPrivacyBody:
      "Your profile and family links are protected at the database level, not just in the interface.",
    pillarHabitsTitle: "Habits, not spreadsheets",
    pillarHabitsBody: "Gentle guidance and financial education that grows with you over time.",

    // auth
    welcomeBack: "Welcome back",
    createWazenAccount: "Create your Wazen account",
    signinSub: "Sign in to continue where you left off.",
    signupSub: "A few details help us shape Wazen around your life stage.",
    haveAccount: "I already have an account",
    email: "Email",
    password: "Password",
    firstName: "First name",
    dateOfBirth: "Date of birth",
    genderField: "Gender (cannot be changed later)",
    female: "Female",
    male: "Male",
    lifeStageField: "Life stage",
    preferredLanguage: "Preferred language",
    baseCurrency: "Base currency",
    forgotPassword: "Forgot password?",
    passwordHint: "At least 8 characters",
    selectDobFirst: "Select your date of birth first",
    selectLifeStage: "Select your life stage",
    setFromAge: "set automatically from age.",
    guardianNote: "A parent or guardian will need to link this account to their own.",
    ageAuto: "calculated automatically, never stored.",
    age: "Age",

    // profile & settings
    yourIdentity: "Your identity",
    editableDetails: "Editable details",
    ageCalculated: "Age (calculated automatically)",
    years: "years",
    gender: "Gender",
    accountType: "Account type",
    photoUrl: "Profile photo URL (optional)",
    firstNameHint: "Wazen only shows first names — no family name is needed.",
    saveChanges: "Save changes",
    profileSaved: "Profile saved",
    accountControls: "Account controls",
    account: "Account",
    preferences: "Preferences",
    security: "Security",
    appearance: "Appearance",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    currentPassword: "Current password",
    newPassword: "New password",
    changePassword: "Change password",
    saveSettings: "Save settings",
    settingsSaved: "Settings saved",
    passwordUpdated: "Password updated",
    enterFirstName: "Enter your first name",
    stageFromAge: "set automatically from your age",

    // subscription
    yourPlan: "Your plan",
    premium: "Premium",
    free: "Free",
    subscriptionStatus: "Subscription status",
    started: "Started",
    renews: "Renews",
    trialEnds: "Trial ends",
    manageSubscription: "Manage subscription",
    upgrade: "Upgrade",
    viewPlan: "View plan",
    statusActive: "Active",
    statusInactive: "Inactive",
    statusCancelled: "Cancelled",
    statusPastDue: "Past due",
    statusTrialing: "Trial",
    premiumViaFamily: "Included in your family subscription",
  },
  ar: {
    // navigation & shell
    overview: "الرئيسية",
    plan: "الاشتراك",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    signOut: "تسجيل الخروج",
    language: "اللغة",
    english: "English",
    arabic: "العربية",

    // dashboard
    quickEntry: "إضافة سريعة",
    addIncome: "إضافة دخل",
    addExpense: "إضافة مصروف",
    addSaving: "إضافة ادخار",
    addGoal: "إضافة هدف",
    availableMoney: "المبلغ المتاح",
    incomeMonth: "دخل هذا الشهر",
    expensesMonth: "مصروفات هذا الشهر",
    totalSavings: "إجمالي المدخرات",
    monthlyBudget: "ميزانية الشهر",
    emergencyFund: "صندوق الطوارئ",
    spendingCategory: "المصروفات حسب الفئة",
    incomeExpenses: "الدخل مقابل المصروفات",
    savingsGoals: "أهداف الادخار",
    upcoming: "الدخل والمدفوعات القادمة",
    recent: "أحدث المعاملات",
    familySummary: "ملخص العائلة",
    loadingFamily: "جارٍ تحميل العائلة…",
    noFamily: "لا يوجد أفراد مرتبطون",
    noFamilyDescription: "سيظهر هنا الأطفال والمراهقون المرتبطون بحسابك.",
    available: "المتاح",
    saved: "المدخر",
    spent: "المصروف",
    all: "الكل",
    moneyIn: "الأموال الداخلة",
    spending: "المصروفات",
    saving: "الادخار",
    noTransactions: "لا توجد معاملات بعد",
    nothingHere: "لا توجد بيانات هنا",
    noTransactionsDescription: "استخدم الإضافة السريعة لتسجيل أول دخل أو مصروف.",
    noScheduled: "لا توجد مبالغ مجدولة",
    noScheduledDescription: "سيظهر هنا الدخل والفواتير وتحويلات الادخار المتكررة.",
    noGoals: "لا توجد أهداف بعد",
    noGoalsDescription: "أنشئ هدفاً وسيتقدم الشريط مع كل مبلغ تدخره.",
    noBudget: "لم تحدد ميزانية لهذا الشهر",
    budgetDescription: "عند تحديد ميزانية شهرية سيظهر المبلغ المتبقي هنا.",
    noEmergency: "لا يوجد صندوق طوارئ بعد",
    emergencyDescription: "أضف هدفاً للطوارئ لتبدأ بمتابعة شبكة الأمان الخاصة بك.",
    income: "دخل",
    expense: "مصروف",
    refund: "مبلغ مسترد",

    // landing
    landingEyebrow: "التمويل الشخصي والتعليم المالي",
    landingTagline: "وازن أموالك بثقة وهدوء.",
    landingBody: "وازن يمنحك وضوحاً في الادخار والصرف والتعلّم — لك ولعائلتك بالكامل.",
    createAccount: "أنشئ حسابك",
    exploreDemo: "تجربة حساب تجريبي",
    signIn: "تسجيل الدخول",
    pillarStagesTitle: "مصمم لكل مرحلة عمرية",
    pillarStagesBody:
      "الأطفال والمراهقون وطلبة الجامعة والموظفون وأصحاب العمل الحر — لكل منهم تجربة تناسبه.",
    pillarPrivacyTitle: "الخصوصية أولاً",
    pillarPrivacyBody: "ملفك وروابط عائلتك محمية على مستوى قاعدة البيانات، وليس في الواجهة فقط.",
    pillarHabitsTitle: "عادات، لا جداول",
    pillarHabitsBody: "إرشاد لطيف وتعليم مالي ينمو معك مع الوقت.",

    // auth
    welcomeBack: "مرحباً بعودتك",
    createWazenAccount: "أنشئ حسابك في وازن",
    signinSub: "سجّل الدخول لتكمل من حيث توقفت.",
    signupSub: "بعض التفاصيل تساعدنا على تهيئة وازن حسب مرحلتك العمرية.",
    haveAccount: "لدي حساب بالفعل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    firstName: "الاسم الأول",
    dateOfBirth: "تاريخ الميلاد",
    genderField: "الجنس (لا يمكن تغييره لاحقاً)",
    female: "أنثى",
    male: "ذكر",
    lifeStageField: "المرحلة العمرية",
    preferredLanguage: "اللغة المفضلة",
    baseCurrency: "العملة الأساسية",
    forgotPassword: "نسيت كلمة المرور؟",
    passwordHint: "٨ أحرف على الأقل",
    selectDobFirst: "اختر تاريخ ميلادك أولاً",
    selectLifeStage: "اختر مرحلتك العمرية",
    setFromAge: "تُحدد تلقائياً من العمر.",
    guardianNote: "سيحتاج أحد الوالدين أو ولي الأمر إلى ربط هذا الحساب بحسابه.",
    ageAuto: "يُحسب تلقائياً ولا يُخزَّن.",
    age: "العمر",

    // profile & settings
    yourIdentity: "هويتك",
    editableDetails: "بيانات قابلة للتعديل",
    ageCalculated: "العمر (يُحسب تلقائياً)",
    years: "سنة",
    gender: "الجنس",
    accountType: "نوع الحساب",
    photoUrl: "رابط صورة الملف (اختياري)",
    firstNameHint: "وازن يعرض الاسم الأول فقط — لا حاجة لاسم العائلة.",
    saveChanges: "حفظ التغييرات",
    profileSaved: "تم حفظ الملف الشخصي",
    accountControls: "إدارة الحساب",
    account: "الحساب",
    preferences: "التفضيلات",
    security: "الأمان",
    appearance: "المظهر",
    lightMode: "الوضع النهاري",
    darkMode: "الوضع الليلي",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    changePassword: "تغيير كلمة المرور",
    saveSettings: "حفظ الإعدادات",
    settingsSaved: "تم حفظ الإعدادات",
    passwordUpdated: "تم تحديث كلمة المرور",
    enterFirstName: "أدخل اسمك الأول",
    stageFromAge: "تُحدد تلقائياً من عمرك",

    // subscription
    yourPlan: "اشتراكك",
    premium: "بريميوم",
    free: "مجاني",
    subscriptionStatus: "حالة الاشتراك",
    started: "تاريخ البدء",
    renews: "التجديد",
    trialEnds: "انتهاء التجربة",
    manageSubscription: "إدارة الاشتراك",
    upgrade: "الترقية",
    viewPlan: "عرض الاشتراك",
    statusActive: "نشط",
    statusInactive: "غير نشط",
    statusCancelled: "ملغى",
    statusPastDue: "متأخر السداد",
    statusTrialing: "تجريبي",
    premiumViaFamily: "مشمول في اشتراك عائلتك",
  },
} as const;

type CopyKey = keyof typeof COPY.en;

type LocaleValue = {
  language: WazenLanguage;
  setLanguage: (language: WazenLanguage) => void;
};

const LocaleContext = createContext<LocaleValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

function readStoredLanguage(): WazenLanguage | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "en" || value === "ar" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Global language provider. A signed-in user's saved preference always wins;
 * visitors fall back to their last choice on this device, then to Arabic.
 */
export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const [local, setLocal] = useState<WazenLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored) setLocal(stored);
  }, []);

  const language: WazenLanguage =
    profile?.language === "en" ? "en" : profile?.language === "ar" ? "ar" : local;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* storage unavailable — direction still applies */
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = useCallback((next: WazenLanguage) => setLocal(next), []);

  return (
    <LocaleContext.Provider value={{ language, setLanguage }}>{children}</LocaleContext.Provider>
  );
}

/** Kept for nested scopes that already know the language (e.g. the app shell). */
export function WazenLocaleProvider({
  language,
  children,
}: {
  language: string | undefined;
  children: ReactNode;
}) {
  const parent = useContext(LocaleContext);
  const resolved: WazenLanguage = language === "ar" ? "ar" : language === "en" ? "en" : parent.language;
  return (
    <LocaleContext.Provider value={{ language: resolved, setLanguage: parent.setLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useWazenLocale() {
  const { language, setLanguage } = useContext(LocaleContext);
  return {
    language,
    setLanguage,
    isArabic: language === "ar",
    /** Numbers, currencies and dates stay structurally correct in both languages. */
    locale: language === "ar" ? "ar-KW" : "en-KW",
    t: (key: CopyKey) => COPY[language][key],
  };
}
