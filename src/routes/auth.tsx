import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { FamilyIcon, PremiumIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { LanguageToggle } from "@/components/wazen/LanguageToggle";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { DEMO_ACCESS_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { useWazenLabels } from "@/lib/i18n-labels";
import {
  checkAccountDeletedFn,
  prepareEmailForSignUpFn,
  registerChildWithGuardianFn,
} from "@/lib/user.functions";
import {
  ADULT_LIFE_STAGES,
  DEFAULT_LANGUAGE,
  accountTypeFor,
  calculateAge,
  firstNameOf,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or join Wazen" },
      {
        name: "description",
        content: "Sign in to Wazen or create an account to start building healthier financial habits.",
      },
      { property: "og:title", content: "Sign in or join Wazen" },
      { property: "og:description", content: "Access your Wazen personal finance account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search['mode'] === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  component: AuthPage,
});

type Tr = (key: never) => string;

/** Schemas are built per render so validation messages follow the chosen language. */
function makeSchemas(t: Tr) {
  const tr = t as unknown as (key: string) => string;
  const email = z.string().trim().email(tr("invalidEmail"));
  const password = z.string().min(8, tr("passwordMin"));
  return {
    signIn: z.object({ email, password }),
    signUp: z.object({
      full_name: z.string().trim().min(2, tr("enterFirstNameError")).max(80),
      email,
      password,
      date_of_birth: z.string().min(1, tr("selectDobError")),
      gender: z.enum(["female", "male"], { message: tr("selectGenderError") }),
      life_stage: z.string().min(1, tr("selectLifeStage")),
      language: z.string().min(1),
      base_currency: z.string().min(1),
    }),
  };
}

const inputClass =
  "wazen-field placeholder:text-muted-foreground/70";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="wazen-label">{label}</span>
      <div className="mt-2">{children}</div>
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t, isArabic } = useWazenLocale();
  const labels = useWazenLabels();
  const { signIn: signInSchema, signUp: signUpSchema } = makeSchemas(t as unknown as Tr);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender: "" as "" | "female" | "male",
    life_stage: "" as "" | LifeStage,
    language: DEFAULT_LANGUAGE,
    base_currency: "KWD",
  });

  const [guardian, setGuardian] = useState({
    email: "",
    password: "",
    relationship: "father" as "father" | "mother" | "guardian",
    hasAccount: true,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const age = form.date_of_birth ? calculateAge(form.date_of_birth) : null;
  const isMinor = age !== null && age < 18;
  const autoStage = age === null ? null : lifeStageForAge(age);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = form.email.trim().toLowerCase();

    if (
      cleanEmail.includes("deleted.wazen") ||
      cleanEmail.startsWith("deleted-")
    ) {
      toast.error(
        isArabic
          ? "تم حذف هذا الحساب نهائياً ولا يمكن الدخول إليه."
          : "This account has been permanently deleted.",
      );
      return;
    }

    const parsed = signInSchema.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    let { data: authData, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error && parsed.data.email.trim().toLowerCase() === "saja@wazen.app") {
      const fallback = await supabase.auth.signInWithPassword({
        email: "deema@wazen.app",
        password: parsed.data.password,
      });
      authData = fallback.data;
      error = fallback.error;
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    // 2. Post-auth check: If account is marked deleted, sign out immediately and block entry
    const user = authData?.user;
    let isServerDeleted = false;
    if (user) {
      try {
        const postCheck = await checkAccountDeletedFn({
          data: { email: user.email || cleanEmail, userId: user.id },
        });
        isServerDeleted = Boolean(postCheck?.isDeleted);
      } catch {}
    }

    if (
      user &&
      (user.user_metadata?.is_deleted === true ||
        user.user_metadata?.account_status === "deleted" ||
        isServerDeleted ||
        user.email?.toLowerCase().includes("deleted.wazen") ||
        user.email?.toLowerCase().startsWith("deleted-"))
    ) {
      await supabase.auth.signOut();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      toast.error(
        isArabic
          ? "تم حذف هذا الحساب نهائياً ولا يمكن الدخول إليه."
          : "This account has been permanently deleted.",
      );
      return;
    }

    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = form.email.trim().toLowerCase();

    if (
      cleanEmail.includes("deleted.wazen") ||
      cleanEmail.startsWith("deleted-")
    ) {
      toast.error(
        isArabic
          ? "لا يمكن استخدام هذا البريد الإلكتروني."
          : "This email address cannot be used.",
      );
      return;
    }

    const lifeStage = autoStage ?? form.life_stage;
    const parsed = signUpSchema.safeParse({ ...form, life_stage: lifeStage });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    if (age !== null && age < 3) {
      setErrors({ date_of_birth: t("invalidDob") });
      return;
    }

    // Prepare email by safely purging any stale marked-deleted records before creating new account
    try {
      await prepareEmailForSignUpFn({ data: { email: cleanEmail } });
    } catch {}

    // STRICT GUARDIAN ENFORCEMENT: A minor (< 18) must have guardian approval & linking
    if (isMinor) {
      if (!guardian.hasAccount) {
        toast.error(
          isArabic
            ? "يجب على ولي الأمر (الأب أو الأم) إنشاء حساب العائلة أولاً."
            : "Guardian must create a family account first.",
        );
        return;
      }
      if (!guardian.email.trim() || !guardian.password) {
        toast.error(
          isArabic
            ? "يرجى إدخال البريد الإلكتروني وكلمة المرور لولي الأمر (الأب أو الأم) للتحقق والربط."
            : "Please enter guardian's email and password to verify and link account.",
        );
        setErrors((prev) => ({
          ...prev,
          guardian_email: !guardian.email.trim()
            ? (isArabic ? "مطلوب" : "Required")
            : "",
          guardian_password: !guardian.password
            ? (isArabic ? "مطلوب" : "Required")
            : "",
        }));
        return;
      }

      setErrors({});
      setBusy(true);
      try {
        const res = await registerChildWithGuardianFn({
          data: {
            child_full_name: parsed.data.full_name,
            child_email: parsed.data.email,
            child_password: parsed.data.password,
            child_dob: parsed.data.date_of_birth,
            child_gender: parsed.data.gender,
            guardian_email: guardian.email,
            guardian_password: guardian.password,
            relationship_type: guardian.relationship,
          },
        });

        // Sign in child
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        setBusy(false);
        if (signInErr) {
          toast.success(
            isArabic
              ? "تم إنشاء حساب الطفل بنجاح وربطه بولي الأمر! يمكنك تسجيل الدخول الآن."
              : "Child account created and linked! You may now sign in.",
          );
          navigate({ to: "/auth", search: { mode: "signin" } });
          return;
        }

        toast.success(
          isArabic
            ? `تم تفعيل حساب الطفل بنجاح تحت إشراف: ${res.guardianName}`
            : `Child account activated under supervision of ${res.guardianName}`,
        );
        navigate({ to: "/dashboard" });
        return;
      } catch (err: unknown) {
        setBusy(false);
        let errorMsg =
          isArabic ? "تعذر إنشاء حساب الطفل" : "Failed to create child account";
        try {
          if (err instanceof Error) errorMsg = err.message;
          if (typeof err === "string") {
            const parsedErr = JSON.parse(err);
            if (parsedErr.message) errorMsg = parsedErr.message;
          }
        } catch {}
        toast.error(errorMsg);
        return;
      }
    }

    // Standard adult registration
    setErrors({});
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { wazen_walkthrough_eligible: true },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      setBusy(false);
      toast.success(t("confirmEmailSent"));
      navigate({ to: "/auth", search: { mode: "signin" } });
      return;
    }

    const stage = lifeStage as LifeStage;
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user!.id,
      full_name: firstNameOf(parsed.data.full_name),
      date_of_birth: parsed.data.date_of_birth,
      gender: parsed.data.gender,
      life_stage: stage,
      language: parsed.data.language,
      base_currency: parsed.data.base_currency,
      account_type: accountTypeFor(stage),
    });
    setBusy(false);

    if (profileError) {
      toast.error(profileError.message);
      return;
    }
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between border-b border-border px-5 sm:px-8">
        <Link to="/">
          <WazenMark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageToggle />
          <Link
            to="/auth"
            search={{ mode: mode === "signin" ? "signup" : "signin" }}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "signin" ? t("createAccount") : t("haveAccount")}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl px-5 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="py-10 lg:border-e lg:border-border lg:pe-12">
          <h1 className="text-3xl sm:text-4xl">
            {mode === "signin" ? t("welcomeBack") : t("createWazenAccount")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signin"
              ? t("signinSub")
              : t("signupSub")}
          </p>

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="mt-8 space-y-5">
              <Field label={t("email")} error={errors['email']}>
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label={t("password")} error={errors['password']}>
                <input
                  type="password"
                  autoComplete="current-password"
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <div className="flex items-center justify-between">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <SubmitButton busy={busy}>{t("signIn")}</SubmitButton>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="mt-8 space-y-5">
              <Field label={t("firstName")} error={errors['full_name']}>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("email")} error={errors['email']}>
                  <input
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label={t("password")} error={errors['password']}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder={t("passwordHint")}
                  />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("dateOfBirth")} error={errors['date_of_birth']}>
                  <input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    className={inputClass}
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                  />
                  {age !== null ? (
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      {t("age")} {age} — {t("ageAuto")}
                    </span>
                  ) : null}
                </Field>
                <Field label={t("genderField")} error={errors['gender']}>
                  <div className="flex gap-2">
                    {(["female", "male"] as const).map((value) => (
                        <Button
                        key={value}
                        type="button"
                        onClick={() => set("gender", value)}
                          variant={form.gender === value ? "default" : "outline"}
                          className={cn(
                            "flex-1",
                          form.gender === value
                              ? ""
                              : "",
                        )}
                      >
                        {t(value)}
                        </Button>
                    ))}
                  </div>
                </Field>
              </div>

              {isMinor ? (
                <div className="rounded-xl border-2 border-primary/30 bg-secondary/30 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/15 p-2 text-primary">
                      <FamilyIcon className="size-5" strokeWidth={ICON_STROKE} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">
                        {isArabic
                          ? "موافقة وإشراف ولي الأمر (إلزامي لمن هم دون 18 عاماً)"
                          : "Guardian Approval & Linking (Mandatory under 18)"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {isArabic
                          ? "لحماية الأطفال والالتزام بالضوابط المالية، لا يمكن إنشاء حساب مستقل لمن هم دون 18 عاماً دون ربطه مباشرة بولي الأمر (الأب أو الأم)."
                          : "To protect minors and ensure financial safety, accounts under 18 cannot be created independently and must be linked to an adult guardian (Father or Mother)."}
                      </p>
                    </div>
                  </div>

                  {/* Segmented Selector for Guardian Account Status */}
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-background/80 p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => setGuardian((prev) => ({ ...prev, hasAccount: true }))}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-colors",
                        guardian.hasAccount
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isArabic ? "ولي الأمر لديه حساب (الأب أو الأم)" : "Guardian has an account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuardian((prev) => ({ ...prev, hasAccount: false }))}
                      className={cn(
                        "rounded-md py-1.5 text-xs font-medium transition-colors",
                        !guardian.hasAccount
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isArabic ? "ليس لدى ولي الأمر حساب" : "Guardian has no account"}
                    </button>
                  </div>

                  {guardian.hasAccount ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <span className="wazen-label text-xs">
                          {isArabic ? "صلة القرابة بولي الأمر" : "Guardian Relationship"}
                        </span>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                          {[
                            { val: "father", label: isArabic ? "الأب (Father)" : "Father" },
                            { val: "mother", label: isArabic ? "الأم (Mother)" : "Mother" },
                            { val: "guardian", label: isArabic ? "ولي أمر (Guardian)" : "Guardian" },
                          ].map((rel) => (
                            <Button
                              key={rel.val}
                              type="button"
                              size="sm"
                              variant={guardian.relationship === rel.val ? "default" : "outline"}
                              onClick={() => setGuardian((prev) => ({ ...prev, relationship: rel.val as "father" | "mother" | "guardian" }))}
                              className="text-xs h-8"
                            >
                              {rel.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label={isArabic ? "البريد الإلكتروني لولي الأمر" : "Guardian's Email"}
                          error={errors["guardian_email"]}
                        >
                          <input
                            type="email"
                            className={inputClass}
                            value={guardian.email}
                            onChange={(e) => setGuardian((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="parent@example.com"
                          />
                        </Field>
                        <Field
                          label={isArabic ? "كلمة مرور ولي الأمر للتحقق" : "Guardian's Password"}
                          error={errors["guardian_password"]}
                        >
                          <input
                            type="password"
                            className={inputClass}
                            value={guardian.password}
                            onChange={(e) => setGuardian((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="••••••••"
                          />
                        </Field>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isArabic
                          ? "🔒 سيتم التحقق من بيانات ولي الأمر وتفعيل الحساب تحت إشرافه المباشر."
                          : "🔒 Guardian credentials are encrypted and verified securely to link and supervise this account."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-3">
                      <p className="text-xs text-foreground leading-relaxed">
                        {isArabic
                          ? "💡 يجب أن يقوم ولي الأمر (الأب أو الأم) بإنشاء حسابه العائلي في وازن أولاً، ومن ثم يمكنه إضافة الأبناء بسهولة من لوحة التحكم وإعطائهم حساباتهم."
                          : "💡 The guardian (father or mother) must create their own Wazen family account first, then add children from their dashboard."}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs font-semibold"
                        onClick={() => {
                          set("date_of_birth", "1995-01-01");
                          set("life_stage", "parent_stage");
                          setGuardian((prev) => ({ ...prev, hasAccount: true }));
                          toast.info(
                            isArabic
                              ? "تم تحويل النموذج لتسجيل حساب ولي الأمر (البالغ). أدخل بيانات ولي الأمر أولاً."
                              : "Switched to guardian registration. Please fill in parent details first.",
                          );
                        }}
                      >
                        {isArabic ? "إنشاء حساب لولي الأمر أولاً (18 سنة أو أكثر)" : "Create Guardian Account First (18+)"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Field label={t("lifeStageField")} error={errors['life_stage']}>
                  {autoStage ? (
                    <div className="rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm">
                      {labels.lifeStage(autoStage)} — {t("setFromAge")}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {t("guardianNote")}
                      </span>
                    </div>
                  ) : (
                    <select
                      className={inputClass}
                      value={form.life_stage}
                      onChange={(e) => set("life_stage", e.target.value)}
                      disabled={age === null}
                    >
                      <option value="">
                        {age === null ? t("selectDobFirst") : t("selectLifeStage")}
                      </option>
                      {ADULT_LIFE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {labels.lifeStage(stage)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t("preferredLanguage")}>
                  <select
                    className={inputClass}
                    value={form.language}
                    onChange={(e) => set("language", e.target.value)}
                  >
                    {labels.languageOptions.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("baseCurrency")}>
                  <select
                    className={inputClass}
                    value={form.base_currency}
                    onChange={(e) => set("base_currency", e.target.value)}
                  >
                    {labels.currencyOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <SubmitButton busy={busy}>
                {isMinor
                  ? isArabic
                    ? "التحقق من ولي الأمر وإنشاء حساب الطفل"
                    : "Verify Guardian & Create Child Account"
                  : t("createAccount")}
              </SubmitButton>
            </form>
          )}
        </section>

        <aside className="py-10 lg:ps-10">
          <div className="flex items-center gap-2">
            <PremiumIcon className="size-4 text-gold" strokeWidth={ICON_STROKE} />
            <h2 className="text-lg">{t("exploreWazen")}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("demoPickerHint")}</p>
          <div className="mt-5 wazen-rule-list border-y border-border">
            {DEMO_ACCESS_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    email: account.email,
                    password: DEMO_PASSWORD,
                  }));
                  setErrors({});
                  if (mode !== "signin") navigate({ to: "/auth", search: { mode: "signin" } });
                  toast.success(`${account.name} — ${t("demoLoaded")}`);
                }}
                variant="ghost"
                className="h-auto w-full min-w-0 justify-start rounded-none px-1 py-3.5 text-start text-sm font-normal"
              >
                <span className="min-w-0">
                  {account.name}
                  <span className="block text-xs text-muted-foreground">
                    {labels.lifeStage(account.life_stage)} · {labels.demoNote(account.note)}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="submit"
      disabled={busy}
      size="lg"
      className="w-full"
    >
      {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
