import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, ForwardIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  ADULT_LIFE_STAGES,
  DEFAULT_LANGUAGE,
  accountTypeFor,
  calculateAge,
  firstNameOf,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useWazenLabels } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Account setup — Wazen" },
      { name: "description", content: "Complete your Wazen account setup and preferences." },
      { property: "og:title", content: "Account setup — Wazen" },
      { property: "og:description", content: "Complete your Wazen account setup and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const inputClass =
  "wazen-field";

function Onboarding() {
  const { t } = useWazenLocale();
  const labels = useWazenLabels();
  const STEPS = [t("stepBasics"), t("stepLifeStage"), t("stepPreferences")];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
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
          <h1 className="text-2xl">{t("profileMissing")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("profileMissingBody")}</p>
        </div>
      </div>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const autoStage = lifeStageForAge(age);
  const effectiveStage = (autoStage ?? lifeStage) as LifeStage;

  async function saveAndFinish() {
    if (!effectiveStage) {
      toast.error(t("selectLifeStage"));
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
                    "flex size-7 items-center justify-center rounded-md text-xs",
                    index <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {index < step ? <CheckIcon className="size-3.5" /> : index + 1}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{label}</span>
                {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
              </div>
            ))}
          </div>
        ) : null}

        <section className="border-y border-border py-8 sm:py-10">
          {step === 0 ? (
            <>
              <h1 className="text-3xl">{t("basicInfoTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("basicInfoBody")}</p>
              <div className="mt-7 space-y-5">
                <label className="block">
                  <span className="wazen-label">{t("firstName")}</span>
                  <input
                    className={cn(inputClass, "mt-2")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <ReadOnlyRow label={t("dateOfBirth")} value={profile.date_of_birth} />
                  <ReadOnlyRow label={t("gender")} value={labels.gender(profile.gender)} />
                </div>
                <ReadOnlyRow label={t("age")} value={`${age} ${t("yearsOld")}`} />
              </div>
              <NextButton
                onClick={() => {
                  if (fullName.trim().length < 2) {
                    toast.error(t("enterFirstNameError"));
                    return;
                  }
                  setStep(1);
                }}
              >
                {t("continueLabel")}
              </NextButton>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="text-3xl">{t("lifeStageTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("lifeStageAgeBody")} {age} {t("yearsOld")}.
              </p>
              <div className="mt-7">
                {autoStage ? (
                   <div className="rounded-lg border border-input bg-secondary/60 p-5 text-sm">
                    <strong className="font-normal">{labels.lifeStage(autoStage)}</strong> —{" "}
                    {t("autoStageNote")}
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {t("guardianLinkNote")}
                    </span>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ADULT_LIFE_STAGES.map((stage) => (
                       <Button
                        key={stage}
                        type="button"
                        onClick={() => setLifeStage(stage)}
                         variant={lifeStage === stage ? "default" : "outline"}
                         className="h-auto justify-start p-5 text-start"
                      >
                        {labels.lifeStage(stage)}
                       </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <BackButton onClick={() => setStep(0)} label={t("backLabel")} />
                <NextButton inline onClick={() => setStep(2)}>
                  {t("continueLabel")}
                </NextButton>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="text-3xl">{t("preferencesTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("preferencesBody")}</p>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="wazen-label">{t("language")}</span>
                  <select
                    className={cn(inputClass, "mt-2")}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {labels.languageOptions.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="wazen-label">{t("baseCurrency")}</span>
                  <select
                    className={cn(inputClass, "mt-2")}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {labels.currencyOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-8 flex gap-3">
                <BackButton onClick={() => setStep(1)} label={t("backLabel")} />
                <NextButton inline busy={busy} onClick={saveAndFinish}>
                  {t("finishSetup")}
                </NextButton>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div className="py-6 text-center">
              <p className="wazen-label">{t("allSet")}</p>
              <h1 className="mt-4 text-2xl min-[375px]:text-3xl sm:text-5xl">
                {t("welcomeToWazen")}، {firstNameOf(fullName)}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                {labels.welcomeMessage(effectiveStage)}
              </p>
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-9"
              >
                {t("goToDashboard")}
                <ForwardIcon className="size-4" strokeWidth={ICON_STROKE} />
              </Button>
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
          "mt-2 rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground",
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
    <Button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(inline ? "flex-1" : "mt-8 w-full sm:w-auto")}
    >
      {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="outline"
    >
      {label}
    </Button>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
