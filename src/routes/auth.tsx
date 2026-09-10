import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import {
  ADULT_LIFE_STAGES,
  CURRENCIES,
  LANGUAGES,
  LIFE_STAGE_LABELS,
  accountTypeFor,
  calculateAge,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";

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

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  date_of_birth: z.string().min(1, "Select your date of birth"),
  gender: z.enum(["female", "male"], { message: "Select a gender" }),
  life_stage: z.string().min(1, "Select your life stage"),
  language: z.string().min(1),
  base_currency: z.string().min(1),
});

const inputClass =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/50";

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
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    date_of_birth: "",
    gender: "" as "" | "female" | "male",
    life_stage: "" as "" | LifeStage,
    language: "en",
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
      setErrors({ date_of_birth: "Please enter a valid date of birth" });
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
      toast.success("Check your email to confirm your account, then sign in.");
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
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
        <Link to="/">
          <WazenMark />
        </Link>
        <Link
          to="/auth"
          search={{ mode: mode === "signin" ? "signup" : "signin" }}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Create an account" : "I already have an account"}
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="wazen-panel p-6 sm:p-10">
          <h1 className="text-3xl sm:text-4xl">
            {mode === "signin" ? "Welcome back" : "Create your Wazen account"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue where you left off."
              : "A few details help us shape Wazen around your life stage."}
          </p>

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="mt-8 space-y-5">
              <Field label="Email" error={errors['email']}>
                <input
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password" error={errors['password']}>
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
                  Forgot password?
                </Link>
              </div>
              <SubmitButton busy={busy}>Sign in</SubmitButton>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="mt-8 space-y-5">
              <Field label="Full name" error={errors['full_name']}>
                <input
                  className={inputClass}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="Mariam Al-Sabah"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" error={errors['email']}>
                  <input
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Password" error={errors['password']}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date of birth" error={errors['date_of_birth']}>
                  <input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    className={inputClass}
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                  />
                  {age !== null ? (
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      Age {age} — calculated automatically, never stored.
                    </span>
                  ) : null}
                </Field>
                <Field label="Gender (cannot be changed later)" error={errors['gender']}>
                  <div className="flex gap-2">
                    {(["female", "male"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("gender", value)}
                        className={cn(
                          "flex-1 rounded-2xl border px-4 py-3 text-sm capitalize transition-colors",
                          form.gender === value
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-input hover:bg-secondary",
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Life stage" error={errors['life_stage']}>
                {autoStage ? (
                  <div className="rounded-2xl border border-input bg-secondary/60 px-4 py-3 text-sm">
                    {LIFE_STAGE_LABELS[autoStage]} — set automatically from age.
                    <span className="mt-1 block text-xs text-muted-foreground">
                      A parent or guardian will need to link this account to their own.
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
                      {age === null ? "Select your date of birth first" : "Select your life stage"}
                    </option>
                    {ADULT_LIFE_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {LIFE_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Preferred language">
                  <select
                    className={inputClass}
                    value={form.language}
                    onChange={(e) => set("language", e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Base currency">
                  <select
                    className={inputClass}
                    value={form.base_currency}
                    onChange={(e) => set("base_currency", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <SubmitButton busy={busy}>Create account</SubmitButton>
            </form>
          )}
        </section>

        <aside className="wazen-panel h-fit p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold" strokeWidth={1.5} />
            <h2 className="text-lg">Explore Wazen</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a demo account to fill the sign-in form, then press Sign in.
          </p>
          <div className="mt-5 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
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
                  toast.success(`${account.name} loaded — press Sign in`);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-secondary"
              >
                <span>
                  {account.name}
                  <span className="block text-xs text-muted-foreground">
                    {LIFE_STAGE_LABELS[account.life_stage]} · {account.note}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
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
