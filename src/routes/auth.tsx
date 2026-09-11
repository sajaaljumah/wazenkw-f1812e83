import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PremiumIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { LanguageToggle } from "@/components/wazen/LanguageToggle";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { DEMO_ACCESS_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { useWazenLabels } from "@/lib/i18n-labels";
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
  const { t } = useWazenLocale();
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

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const age = form.date_of_birth ? calculateAge(form.date_of_birth) : null;
  const autoStage = age === null ? null : lifeStageForAge(age);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signInSchema.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
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
    setErrors({});
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin },
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

              <SubmitButton busy={busy}>{t("createAccount")}</SubmitButton>
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
