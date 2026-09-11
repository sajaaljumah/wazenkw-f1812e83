import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LockedIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/wazen/AppShell";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { useProfile } from "@/hooks/use-wazen-auth";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { PlanBadge } from "@/components/wazen/subscription/PlanBadge";
import {
  ACCOUNT_TYPE_LABELS,
  CURRENCIES,
  DEFAULT_LANGUAGE,
  GENDER_LABELS,
  LANGUAGES,
  LIFE_STAGE_LABELS,
  calculateAge,
  firstNameOf,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const inputClass =
  "wazen-field";

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { t } = useWazenLocale();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [currency, setCurrency] = useState("KWD");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAvatarUrl(profile.avatar_url ?? "");
    setLanguage(profile.language);
    setCurrency(profile.base_currency);
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <AppShell>
        <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  async function save() {
    if (!profile) return;
    if (firstNameOf(fullName).length < 2) {
      toast.error(t("enterFirstName"));
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: firstNameOf(fullName),
        avatar_url: avatarUrl.trim() || null,
        language,
        base_currency: currency,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("profileSaved"));
  }

  return (
    <AppShell>
      <p className="wazen-label">{t("yourIdentity")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="wazen-page-title">{t("profile")}</h1>
        <PlanBadge />
      </div>

      <section className="mt-8 flex flex-col items-center gap-5 border-y border-border py-7 sm:flex-row">
        <WazenAvatar
          fullName={profile.full_name}
          gender={profile.gender}
          lifeStage={profile.life_stage}
          avatarUrl={profile.avatar_url}
          size={80}
        />
        <div className="text-center sm:text-start">
          <p className="text-2xl">{firstNameOf(profile.full_name)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {LIFE_STAGE_LABELS[profile.life_stage]} · {ACCOUNT_TYPE_LABELS[profile.account_type]}
          </p>
        </div>
      </section>

      <section className="mt-8 grid border-y border-border sm:grid-cols-2">
        <LockedField label={t("dateOfBirth")} value={profile.date_of_birth} />
        <LockedField label={t("ageCalculated")} value={`${calculateAge(profile.date_of_birth)} ${t("years")}`} />
        <LockedField label={t("gender")} value={GENDER_LABELS[profile.gender]} />
        <LockedField label={t("accountType")} value={ACCOUNT_TYPE_LABELS[profile.account_type]} />
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("editableDetails")}</h2>
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="wazen-label">{t("firstName")}</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mariam"
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">{t("firstNameHint")}</span>
          </label>
          <label className="block">
            <span className="wazen-label">{t("photoUrl")}</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="wazen-label">{t("language")}</span>
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
              <span className="wazen-label">{t("baseCurrency")}</span>
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
          <Button
            onClick={save}
            disabled={busy}
          >
            {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
            {t("saveChanges")}
          </Button>
        </div>
      </section>
    </AppShell>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-1 py-5 odd:sm:border-e odd:sm:pe-6 even:sm:ps-6 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="wazen-label flex items-center gap-1.5">
        <LockedIcon className="size-3" strokeWidth={ICON_STROKE} />
        {label}
      </span>
      <p className="mt-3 text-lg">{value}</p>
    </div>
  );
}
