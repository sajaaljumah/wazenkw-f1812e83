import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/wazen/AppShell";
import { useProfile, useSession, useSignOut } from "@/hooks/use-wazen-auth";
import {
  ADULT_LIFE_STAGES,
  CURRENCIES,
  GENDER_LABELS,
  LANGUAGES,
  LIFE_STAGE_LABELS,
  accountTypeFor,
  calculateAge,
  firstNameOf,
  lifeStageForAge,
  type LifeStage,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const inputClass =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

function SettingsPage() {
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile();

  const [fullName, setFullName] = useState("");
  const [lifeStage, setLifeStage] = useState<LifeStage | "">("");
  const [language, setLanguage] = useState("en");
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (isLoading || !profile) {
    return (
      <AppShell>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  const age = calculateAge(profile.date_of_birth);
  const stageLocked = lifeStageForAge(age) !== null;

  async function save() {
    if (fullName.trim().length < 2) {
      toast.error("Enter your first name");
      return;
    }
    const stage = (stageLocked ? profile!.life_stage : lifeStage) as LifeStage;
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
      .eq("id", profile!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Settings saved");
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
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
    toast.success("Password updated");
  }

  return (
    <AppShell>
      <h1 className="text-3xl sm:text-4xl">Settings</h1>

      <section className="mt-6 wazen-panel p-7 sm:p-9">
        <h2 className="text-xl">Account</h2>
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="wazen-label">First name</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <Locked label="Email" value={user?.email ?? ""} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Locked label="Date of birth" value={profile.date_of_birth} />
            <Locked label="Gender" value={GENDER_LABELS[profile.gender]} />
          </div>
          <label className="block">
            <span className="wazen-label">Life stage</span>
            {stageLocked ? (
              <div className="mt-2 rounded-2xl border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                {LIFE_STAGE_LABELS[profile.life_stage]} — set automatically from your age ({age}).
              </div>
            ) : (
              <select
                className={cn(inputClass, "mt-2")}
                value={lifeStage}
                onChange={(e) => setLifeStage(e.target.value as LifeStage)}
              >
                {ADULT_LIFE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {LIFE_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>
      </section>

      <section className="mt-6 wazen-panel p-7 sm:p-9">
        <h2 className="text-xl">Preferences</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
          <div>
            <span className="wazen-label">Appearance</span>
            <div className="mt-2 flex gap-2">
              {(["light", "dark"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex-1 rounded-2xl border px-4 py-3 text-sm capitalize transition-colors",
                    theme === value
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-input hover:bg-secondary",
                  )}
                >
                  {value} mode
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save settings
        </button>
      </section>

      <section className="mt-6 wazen-panel p-7 sm:p-9">
        <h2 className="text-xl">Security</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="wazen-label">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              className={cn(inputClass, "mt-2")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="wazen-label">New password</span>
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
          <button
            onClick={changePassword}
            disabled={pwBusy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pwBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Change password
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 text-sm transition-colors hover:bg-secondary"
          >
            <LogOut className="size-4" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="wazen-label flex items-center gap-1.5">
        <Lock className="size-3" strokeWidth={1.75} />
        {label}
      </span>
      <div className="mt-2 rounded-2xl border border-input bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}
