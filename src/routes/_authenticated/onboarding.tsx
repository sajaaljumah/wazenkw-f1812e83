import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  ADULT_LIFE_STAGES,
  CURRENCIES,
  LANGUAGES,
  LIFE_STAGE_LABELS,
  accountTypeFor,
  calculateAge,
  lifeStageForAge,
  welcomeMessage,
  type LifeStage,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const inputClass =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

const STEPS = ["Basics", "Life stage", "Preferences"];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("KWD");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setLifeStage(profile.life_stage);
    setLanguage(profile.language);
    setCurrency(profile.base_currency);
  }, [profile]);

  if (isLoading) return <CenteredSpinner />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="wazen-panel max-w-md p-8 text-center">
          <h1 className="text-2xl">We couldn't find your profile</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please sign in again to finish setting up your account.
          </p>
        </div>
      </div>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const autoStage = lifeStageForAge(age);
  const effectiveStage = (autoStage ?? lifeStage) as LifeStage;

  async function saveAndFinish() {
    if (!effectiveStage) {
      toast.error("Select your life stage");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: firstNameOf(fullName),
        life_stage: effectiveStage,
        account_type: accountTypeFor(effectiveStage),
        language,
        base_currency: currency,
        onboarding_completed: true,
      })
      .eq("id", profile!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-3xl items-center px-6">
        <WazenMark />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {step < 3 ? (
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs",
                    index <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {index < step ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{label}</span>
                {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
              </div>
            ))}
          </div>
        ) : null}

        <section className="wazen-panel p-6 sm:p-10">
          {step === 0 ? (
            <>
              <h1 className="text-3xl">Basic information</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Date of birth and gender are locked once your account is created.
              </p>
              <div className="mt-7 space-y-5">
                <label className="block">
                  <span className="wazen-label">Full name</span>
                  <input
                    className={cn(inputClass, "mt-2")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <ReadOnlyRow label="Date of birth" value={profile.date_of_birth} />
                  <ReadOnlyRow label="Gender" value={profile.gender} capitalize />
                </div>
                <ReadOnlyRow label="Age (calculated)" value={`${age} years`} />
              </div>
              <NextButton
                onClick={() => {
                  if (fullName.trim().length < 2) {
                    toast.error("Enter your full name");
                    return;
                  }
                  setStep(1);
                }}
              >
                Continue
              </NextButton>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="text-3xl">Your life stage</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Based on your date of birth, you are {age} years old.
              </p>
              <div className="mt-7">
                {autoStage ? (
                  <div className="rounded-2xl border border-input bg-secondary/60 p-5 text-sm">
                    <strong className="font-normal">{LIFE_STAGE_LABELS[autoStage]}</strong> — chosen
                    automatically from your age.
                    <span className="mt-2 block text-xs text-muted-foreground">
                      This account must be linked to a parent or guardian, who will be able to
                      support and monitor it.
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ADULT_LIFE_STAGES.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setLifeStage(stage)}
                        className={cn(
                          "rounded-2xl border p-5 text-left text-sm transition-colors",
                          lifeStage === stage
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "border-input hover:bg-secondary",
                        )}
                      >
                        {LIFE_STAGE_LABELS[stage]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <BackButton onClick={() => setStep(0)} />
                <NextButton inline onClick={() => setStep(2)}>
                  Continue
                </NextButton>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="text-3xl">Preferences</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You can change these at any time in Settings.
              </p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="wazen-label">Language</span>
                  <select
                    className={cn(inputClass, "mt-2")}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="wazen-label">Base currency</span>
                  <select
                    className={cn(inputClass, "mt-2")}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-8 flex gap-3">
                <BackButton onClick={() => setStep(1)} />
                <NextButton inline busy={busy} onClick={saveAndFinish}>
                  Finish setup
                </NextButton>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div className="py-6 text-center">
              <p className="wazen-label">You're all set</p>
              <h1 className="mt-4 text-4xl sm:text-5xl">
                Welcome to Wazen, {fullName.split(" ")[0]}.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                {welcomeMessage(effectiveStage)}
              </p>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              >
                Go to Dashboard
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <span className="wazen-label">{label}</span>
      <div
        className={cn(
          "mt-2 rounded-2xl border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground",
          capitalize && "capitalize",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function NextButton({
  onClick,
  children,
  busy,
  inline,
}: {
  onClick: () => void;
  children: React.ReactNode;
  busy?: boolean;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60",
        inline ? "flex-1" : "mt-8 w-full sm:w-auto",
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border px-6 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
    >
      Back
    </button>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
