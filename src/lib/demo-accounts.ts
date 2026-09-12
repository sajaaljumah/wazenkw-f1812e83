import type { Gender, LifeStage } from "./wazen";

export const DEMO_PASSWORD = "12345678";

export type DemoAccount = {
  email: string;
  name: string;
  gender: Gender;
  life_stage: LifeStage;
  note: string;
};

/** Real accounts that exist in the database — see the seeded demo family. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "mariam@wazen.app", name: "Mariam", gender: "female", life_stage: "parent", note: "Mother" },
  { email: "yousef@wazen.app", name: "Yousef", gender: "male", life_stage: "parent", note: "Father" },
  { email: "layan@wazen.app", name: "Layan", gender: "female", life_stage: "child", note: "Age 8" },
  { email: "abdulrahman@wazen.app", name: "Abdulrahman", gender: "male", life_stage: "child", note: "Age 11" },
  { email: "reem@wazen.app", name: "Reem", gender: "female", life_stage: "teenager", note: "Age 14" },
  { email: "fahad@wazen.app", name: "Fahad", gender: "male", life_stage: "teenager", note: "Age 16" },
  { email: "dana@wazen.app", name: "Dana", gender: "female", life_stage: "university_student", note: "Student" },
  { email: "yaqoub@wazen.app", name: "Yaqoub", gender: "male", life_stage: "university_student", note: "Student" },
  { email: "hessa@wazen.app", name: "Hessa", gender: "female", life_stage: "employee", note: "Employee" },
  { email: "saad@wazen.app", name: "Saad", gender: "male", life_stage: "employee", note: "Employee" },
  { email: "saja@wazen.app", name: "Saja", gender: "female", life_stage: "self_employed", note: "Self-employed" },
  { email: "khaled@wazen.app", name: "Khaled", gender: "male", life_stage: "self_employed", note: "Self-employed" },
];

/** One clear entry point per life-stage experience; all seeded accounts remain available. */
export const DEMO_ACCESS_ACCOUNTS = DEMO_ACCOUNTS.filter((account) =>
  [
    "mariam@wazen.app",
    "layan@wazen.app",
    "reem@wazen.app",
    "dana@wazen.app",
    "hessa@wazen.app",
    "saja@wazen.app",
  ].includes(account.email),
);

/**
 * Demo accounts are used for presentations, so the first-use walkthrough is
 * replayed on every sign-in instead of being marked as completed.
 */
export function isDemoAccount(email: string | null | undefined) {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.some((account) => account.email === value) ||
    value === "deema@wazen.app" ||
    value === "saja@wazen.app"
  );
}
