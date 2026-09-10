import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/wazen/AppShell";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { useProfile, useSession } from "@/hooks/use-wazen-auth";
import {
  useFamilySummary,
  useGoals,
  useMonthlyBudget,
  useRecurringItems,
  useTransactions,
} from "@/hooks/use-wazen-finance";
import {
  AdultDashboard,
  ChildDashboard,
  FamilySummaryCard,
  TeenagerDashboard,
} from "@/components/wazen/dashboard/variants";
import type { DashboardData } from "@/components/wazen/dashboard/variants";
import { DashboardHeader } from "@/components/wazen/dashboard/primitives";
import { formatToday } from "@/lib/finance";
import { LIFE_STAGE_LABELS, firstNameOf, welcomeMessage } from "@/lib/wazen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Wazen" },
      { name: "description", content: "Your Wazen money overview: available money, budget, savings goals and upcoming cash flow." },
      { property: "og:title", content: "Dashboard — Wazen" },
      { property: "og:description", content: "Your Wazen money overview: available money, budget, savings goals and upcoming cash flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const transactions = useTransactions();
  const goals = useGoals();
  const budget = useMonthlyBudget();
  const recurring = useRecurringItems();
  const isParent = profile?.life_stage === "parent";
  const family = useFamilySummary(!!isParent);

  useEffect(() => {
    if (profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const loading =
    profileLoading || transactions.isLoading || goals.isLoading || budget.isLoading || recurring.isLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!profile || !user) {
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

  const data: DashboardData = {
    userId: user.id,
    currency: profile.base_currency,
    transactions: transactions.data ?? [],
    goals: goals.data ?? [],
    budget: budget.data ?? null,
    recurring: recurring.data ?? [],
  };

  const firstName = firstNameOf(profile.full_name);

  return (
    <AppShell>
      <div className="space-y-8 wazen-enter">
        {profile.life_stage === "child" ? null : (
          <DashboardHeader
            name={firstName}
            eyebrow={`${LIFE_STAGE_LABELS[profile.life_stage]} experience`}
            subtitle={welcomeMessage(profile.life_stage)}
            today={formatToday()}
            avatar={
              <Link
                to="/profile"
                className="wazen-interactive block rounded-full outline-hidden hover:wazen-interactive-hover focus-visible:ring-2 focus-visible:ring-ring/60"
                title="View your profile"
              >
                <WazenAvatar
                  fullName={profile.full_name}
                  gender={profile.gender}
                  lifeStage={profile.life_stage}
                  avatarUrl={profile.avatar_url}
                  size={72}
                />
              </Link>
            }
          />
        )}

        {profile.life_stage === "child" ? (
          <ChildDashboard
            data={data}
            firstName={firstName}
            fullName={profile.full_name}
            gender={profile.gender}
            avatarUrl={profile.avatar_url}
          />
        ) : profile.life_stage === "teenager" ? (
          <TeenagerDashboard data={data} />
        ) : (
          <AdultDashboard
            data={data}
            focus={profile.life_stage === "university_student" ? "student" : "employee"}
          />
        )}

        {isParent ? <FamilySummaryCard members={family.data ?? []} isLoading={family.isLoading} /> : null}
      </div>
    </AppShell>
  );
}
