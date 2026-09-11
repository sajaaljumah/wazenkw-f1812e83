import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SpinnerIcon } from "@/components/wazen/icons";
import { AppShell } from "@/components/wazen/AppShell";
import { ZakatAlert } from "@/components/wazen/zakat/ZakatAlert";
import { useZakat } from "@/hooks/use-wazen-zakat";
import { canCalculateZakat } from "@/lib/zakat";
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
import { firstNameOf } from "@/lib/wazen";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { FirstUseWalkthrough } from "@/components/wazen/FirstUseWalkthrough";

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

const STAGE_KEY = {
  child: "stageChild",
  teenager: "stageTeenager",
  university_student: "stageUniversity",
  employee: "stageEmployee",
  self_employed: "stageSelfEmployed",
  parent: "stageParent",
} as const;

const WELCOME_KEY = {
  child: "welcomeChild",
  teenager: "welcomeTeenager",
  university_student: "welcomeUniversity",
  employee: "welcomeEmployee",
  self_employed: "welcomeSelfEmployed",
  parent: "welcomeParent",
} as const;

function Dashboard() {
  const navigate = useNavigate();
  const { t, locale } = useWazenLocale();
  const { user } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const transactions = useTransactions();
  const goals = useGoals();
  const budget = useMonthlyBudget();
  const recurring = useRecurringItems();
  const isParent = profile?.life_stage === "parent";
  const family = useFamilySummary(!!isParent);
  const zakat = useZakat();

  useEffect(() => {
    if (profile && !profile.onboarding_completed) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const loading =
    profileLoading || transactions.isLoading || goals.isLoading || budget.isLoading || recurring.isLoading;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!profile || !user) {
    return (
      <AppShell>
        <div className="wazen-panel p-8">
          <h1 className="text-2xl">{t("finishProfile")}</h1>
          <Link to="/onboarding" className="mt-4 inline-block text-sm underline underline-offset-4">
            {t("continueSetup")}
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
      <FirstUseWalkthrough
        userId={user.id}
        eligible={user.user_metadata?.wazen_walkthrough_eligible === true}
        lifeStage={profile.life_stage}
      />
      <div className={`space-y-8 wazen-enter ${profile.life_stage === "teenager" ? "stage-teen" : profile.life_stage === "university_student" ? "stage-university" : ""}`}>
        {profile.life_stage === "child" ? null : (
          <DashboardHeader
            name={firstName}
            eyebrow={`${t(STAGE_KEY[profile.life_stage])} ${t("experience")}`}
            subtitle={t(WELCOME_KEY[profile.life_stage])}
            today={formatToday(new Date(), locale)}
            avatar={
              <Link
                to="/profile"
                className="wazen-interactive block rounded-full outline-hidden hover:wazen-interactive-hover focus-visible:ring-2 focus-visible:ring-ring/60"
                title={t("viewProfile")}
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

        {canCalculateZakat(profile.life_stage) && zakat.result ? (
          <ZakatAlert result={zakat.result} currency={profile.base_currency} compact />
        ) : null}

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

        {isParent ? (
          <FamilySummaryCard
            members={family.data ?? []}
            isLoading={family.isLoading}
            currency={profile.base_currency}
            transactions={transactions.data ?? []}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
