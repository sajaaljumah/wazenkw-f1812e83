export type Gender = "female" | "male";
export type LifeStage =
  | "child"
  | "teenager"
  | "university_student"
  | "employee"
  | "self_employed"
  | "parent";
export type AccountType = "independent" | "dependent" | "parent";

export type Profile = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: Gender;
  life_stage: LifeStage;
  language: string;
  base_currency: string;
  account_type: AccountType;
  avatar_url: string | null;
  theme: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Wazen never shows family names or surnames anywhere in the interface —
 * users are always displayed by their first name.
 */
export function firstNameOf(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : name.trim();
}

/** Age is always derived from date_of_birth — never stored. */
export function calculateAge(dateOfBirth: string | Date): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return Math.max(age, 0);
}

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  child: "Child",
  teenager: "Teenager",
  university_student: "University Student",
  employee: "Employee",
  self_employed: "Self-employed",
  parent: "Parent / Guardian",
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  independent: "Independent account",
  dependent: "Linked to a parent / guardian",
  parent: "Parent / Guardian account",
};

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية (Arabic)" },
];

export const CURRENCIES = [
  { value: "KWD", label: "KWD — Kuwaiti Dinar" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

export const ADULT_LIFE_STAGES: LifeStage[] = [
  "university_student",
  "employee",
  "self_employed",
  "parent",
];

/** Children and teenagers get an age-based stage; adults choose their own. */
export function lifeStageForAge(age: number): LifeStage | null {
  if (age < 13) return "child";
  if (age < 18) return "teenager";
  return null;
}

export function accountTypeFor(lifeStage: LifeStage): AccountType {
  if (lifeStage === "child" || lifeStage === "teenager") return "dependent";
  if (lifeStage === "parent") return "parent";
  return "independent";
}

export function welcomeMessage(lifeStage: LifeStage): string {
  switch (lifeStage) {
    case "child":
      return "Let's learn how to save, spend wisely and reach your goals — one step at a time.";
    case "teenager":
      return "Let's turn smart money habits into second nature before you start earning.";
    case "university_student":
      return "Let's make your budget stretch further while you study.";
    case "employee":
      return "Let's turn your salary into savings, security and long-term goals.";
    case "self_employed":
      return "Let's bring calm and structure to income that changes month to month.";
    case "parent":
      return "Let's build healthier financial habits together with your family.";
  }
}
