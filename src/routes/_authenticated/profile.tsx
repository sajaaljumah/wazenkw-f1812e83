import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/wazen/AppShell";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  ACCOUNT_TYPE_LABELS,
  CURRENCIES,
  GENDER_LABELS,
  LANGUAGES,
  LIFE_STAGE_LABELS,
  calculateAge,
  firstNameOf,
} from "@/lib/wazen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const inputClass =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [language, setLanguage] = useState("en");
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
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  async function save() {
    if (firstNameOf(fullName).length < 2) {
      toast.error("Enter your first name");
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
      .eq("id", profile!.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }

  return (
    <AppShell>
      <h1 className="text-3xl sm:text-4xl">Profile</h1>

      <section className="mt-6 wazen-panel flex flex-col items-center gap-5 p-7 sm:flex-row sm:p-9">
        <WazenAvatar
          fullName={profile.full_name}
          gender={profile.gender}
          lifeStage={profile.life_stage}
          avatarUrl={profile.avatar_url}
          size={80}
        />
        <div className="text-center sm:text-left">
          <p className="text-2xl">{firstNameOf(profile.full_name)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {LIFE_STAGE_LABELS[profile.life_stage]} · {ACCOUNT_TYPE_LABELS[profile.account_type]}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-2">
        <LockedField label="Date of birth" value={profile.date_of_birth} />
        <LockedField label="Age (calculated automatically)" value={`${calculateAge(profile.date_of_birth)} years`} />
        <LockedField label="Gender" value={GENDER_LABELS[profile.gender]} />
        <LockedField label="Account type" value={ACCOUNT_TYPE_LABELS[profile.account_type]} />
      </section>

      <section className="mt-6 wazen-panel p-7 sm:p-9">
        <h2 className="text-xl">Editable details</h2>
        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="wazen-label">First name</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mariam"
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">
              Wazen only shows first names — no family name is needed.
            </span>
          </label>
          <label className="block">
            <span className="wazen-label">Profile photo URL (optional)</span>
            <input
              className={cn(inputClass, "mt-2")}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
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
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </section>
    </AppShell>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="wazen-panel p-6">
      <span className="wazen-label flex items-center gap-1.5">
        <Lock className="size-3" strokeWidth={1.75} />
        {label}
      </span>
      <p className="mt-3 text-lg">{value}</p>
    </div>
  );
}
