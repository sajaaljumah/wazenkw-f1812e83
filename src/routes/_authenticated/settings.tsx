import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LockedIcon, PremiumIcon, ProfileIcon, SignOutIcon, SpinnerIcon, ICON_STROKE } from "@/components/wazen/icons";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/wazen/AppShell";
import { useProfile, useSession, useSignOut } from "@/hooks/use-wazen-auth";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { applyTheme, cacheTheme } from "@/components/wazen/WazenTheme";
import { PlanBadge } from "@/components/wazen/subscription/PlanBadge";
import {
  ADULT_LIFE_STAGES,
  DEFAULT_LANGUAGE,
  accountTypeFor,
  calculateAge,
  firstNameOf,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { useWazenLabels } from "@/lib/i18n-labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Wazen" },
      { name: "description", content: "Manage Wazen language, appearance, security and account controls." },
      { property: "og:title", content: "Settings — Wazen" },
      { property: "og:description", content: "Manage Wazen language, appearance, security and account controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const inputClass =
  "wazen-field";

function SettingsPage() {
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile();
  const { t } = useWazenLocale();
  const labels = useWazenLabels();

  const [fullName, setFullName] = useState("");
  const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [currency, setCurrency] = useState("KWD");
  const [theme, setTheme] = useState("light");
  const [busy, setBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setLifeStage(profile.life_stage);
    setLanguage(profile.language);
    setCurrency(profile.base_currency);
    setTheme(profile.theme);
  }, [profile]);

  // Appearance applies and saves immediately — no Save button needed for it.
  async function chooseTheme(next: "light" | "dark") {
    setTheme(next);
    applyTheme(next);
    if (user?.id) cacheTheme(user.id, next);
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ theme: next })
      .eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  if (isLoading || !profile) {
    return (
      <AppShell>
        <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const stageLocked = lifeStageForAge(age) !== null;

  async function save() {
    if (!profile) return;
    if (fullName.trim().length < 2) {
      toast.error(t("enterFirstName"));
      return;
    }
    const stage = (stageLocked ? profile.life_stage : lifeStage) as LifeStage;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: firstNameOf(fullName),
        life_stage: stage,
        account_type: accountTypeFor(stage),
        language,
        base_currency: currency,
        theme,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("settingsSaved"));
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error(t("passwordHint"));
      return;
    }
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    } as { password: string });
    setPwBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success(t("passwordUpdated"));
  }

  return (
    <AppShell>
      <p className="wazen-label">{t("accountControls")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="wazen-page-title">{t("settings")}</h1>
        <PlanBadge />
      </div>

      <section className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
        <SettingsLink
          to="/profile"
          icon={ProfileIcon}
          title={t("personalInformation")}
          body={t("personalInformationBody")}
          action={t("openLabel")}
        />
        <SettingsLink
          to="/subscription"
          icon={PremiumIcon}
          title={t("subscriptionSection")}
          body={t("subscriptionSectionBody")}
          action={t("openLabel")}
        />
      </section>

      <section className="mt-8 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("account")}</h2>
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="wazen-label">{t("firstName")}</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <Locked label={t("email")} value={user?.email ?? ""} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Locked label={t("dateOfBirth")} value={profile.date_of_birth} />
            <Locked label={t("gender")} value={labels.gender(profile.gender)} />
          </div>
          <label className="block">
            <span className="wazen-label">{t("lifeStageField")}</span>
            {stageLocked ? (
              <div className="mt-2 rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                {labels.lifeStage(profile.life_stage)} — {t("stageFromAge")} ({age}).
              </div>
            ) : (
              <select
                className={cn(inputClass, "mt-2")}
                value={lifeStage}
                onChange={(e) => setLifeStage(e.target.value as LifeStage)}
              >
                {ADULT_LIFE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {labels.lifeStage(stage)}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("preferences")}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
          <div>
            <span className="wazen-label">{t("appearance")}</span>
            <div className="mt-2 flex gap-2">
              {(["light", "dark"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  onClick={() => void chooseTheme(value)}
                  variant={theme === value ? "default" : "outline"}
                  className="flex-1"
                >
                  {value === "light" ? t("lightMode") : t("darkMode")}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button
          onClick={save}
          disabled={busy}
          className="mt-7"
        >
          {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {t("saveSettings")}
        </Button>
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("security")}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="wazen-label">{t("currentPassword")}</span>
            <input
              type="password"
              autoComplete="current-password"
              className={cn(inputClass, "mt-2")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="wazen-label">{t("newPassword")}</span>
            <input
              type="password"
              autoComplete="new-password"
              className={cn(inputClass, "mt-2")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            onClick={changePassword}
            disabled={pwBusy}
          >
            {pwBusy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
            {t("changePassword")}
          </Button>
          <Button
            onClick={signOut}
            variant="outline"
          >
            <SignOutIcon className="size-4" strokeWidth={ICON_STROKE} />
            {t("signOut")}
          </Button>
        </div>
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("notifications")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("notificationsBody")}</p>
      </section>

      <section className="mt-10 max-w-3xl border-t border-border pt-7">
        <h2 className="text-xl">{t("privacy")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("privacyBody")}</p>
      </section>
    </AppShell>
  );
}

function SettingsLink({
  to,
  icon: Icon,
  title,
  body,
  action,
}: {
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-1 py-5 transition-colors hover:bg-secondary/50"
    >
      <Icon className="size-5 shrink-0 text-primary" strokeWidth={ICON_STROKE} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-primary">{action}</span>
    </Link>
  );
}


function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="wazen-label flex items-center gap-1.5">
        <LockedIcon className="size-3" strokeWidth={ICON_STROKE} />
        {label}
      </span>
      <div className="mt-2 rounded-lg border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}
