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
  { email: "deema@wazen.app", name: "Deema", gender: "female", life_stage: "self_employed", note: "Self-employed" },
  { email: "khaled@wazen.app", name: "Khaled", gender: "male", life_stage: "self_employed", note: "Self-employed" },
];
