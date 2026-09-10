import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/wazen/AppShell";
import { useProfile } from "@/hooks/use-wazen-auth";
import { LIFE_STAGE_LABELS, calculateAge, welcomeMessage } from "@/lib/wazen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();

  useEffect(() => {
    if (profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  if (isLoading) {
    return (
      <AppShell>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="wazen-panel p-8">
          <h1 className="text-2xl">Finish setting up your profile</h1>
          <Link to="/onboarding" className="mt-4 inline-block text-sm underline underline-offset-4">
            Continue setup
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="wazen-panel p-7 sm:p-10">
        <p className="wazen-label">{LIFE_STAGE_LABELS[profile.life_stage]} experience</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">
          Welcome to Wazen, {profile.full_name.split(" ")[0]}.
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground">{welcomeMessage(profile.life_stage)}</p>
      </section>

      <section className="mt-6 grid gap-5 sm:grid-cols-3">
        <Stat label="Age" value={`${calculateAge(profile.date_of_birth)} years`} />
        <Stat label="Base currency" value={profile.base_currency} />
        <Stat label="Language" value={profile.language === "ar" ? "العربية" : "English"} />
      </section>

      <section className="mt-6 wazen-panel p-7 text-center sm:p-12">
        <Sparkles className="mx-auto size-6 text-gold" strokeWidth={1.25} />
        <h2 className="mt-5 text-2xl">Your financial dashboard is coming next</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Budgets, goals, allowances and financial education will appear here as Wazen grows. For
          now, your account, profile and family foundation are ready.
        </p>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="wazen-panel p-6">
      <span className="wazen-label">{label}</span>
      <p className="mt-3 text-2xl">{value}</p>
    </div>
  );
}
