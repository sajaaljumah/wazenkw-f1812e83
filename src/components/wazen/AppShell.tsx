import { Link, useLocation } from "@tanstack/react-router";
import { DashboardIcon, PortfolioIcon, PremiumIcon, ProfileIcon, SettingsIcon, SignOutIcon, ZakatIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useEffect, type ReactNode } from "react";
import { useProfile, useSignOut } from "@/hooks/use-wazen-auth";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { Button } from "@/components/ui/button";
import { WazenLocaleProvider, useWazenLocale } from "@/components/wazen/WazenLocale";
import { PlanBadge } from "@/components/wazen/subscription/PlanBadge";
import { firstNameOf } from "@/lib/wazen";
import { canOwnAssets } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { WazenLogo } from "@/components/wazen/WazenLogo";

const NAV = [
  { to: "/dashboard", label: "overview", icon: DashboardIcon },
  { to: "/assets", label: "assets", icon: PortfolioIcon, adultsOnly: true },
  { to: "/zakat", label: "zakat", icon: ZakatIcon, adultsOnly: true },
  { to: "/subscription", label: "plan", icon: PremiumIcon },
  { to: "/profile", label: "profile", icon: ProfileIcon },
  { to: "/settings", label: "settings", icon: SettingsIcon },
] as const;

export function WazenMark({ className, size = 40 }: { className?: string; size?: number }) {
  return <WazenLogo size={size} className={cn("transition-opacity hover:opacity-85", className)} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const signOut = useSignOut();
  const { data: profile } = useProfile();
  const { t } = useWazenLocale();
  // Assets belong to independent adult accounts only.
  const nav = NAV.filter((item) => !("adultsOnly" in item && item.adultsOnly) || canOwnAssets(profile?.life_stage));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", profile?.theme === "dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [profile?.theme]);


  return (
    <div className={cn("min-h-screen bg-background", profile?.life_stage === "teenager" && "stage-teen", profile?.life_stage === "university_student" && "stage-university")}>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 shadow-soft backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link to="/dashboard" className="shrink-0" aria-label="Wazen overview">
              <WazenMark />
            </Link>
            <nav className="hidden items-center gap-6 sm:flex" aria-label="Primary navigation">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex h-[4.5rem] items-center gap-2 border-b-2 px-1 text-sm font-semibold transition-colors",
                  location.pathname === to
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={ICON_STROKE} />
                {t(label)}
              </Link>
            ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge className="hidden sm:inline-flex" size="sm" />
            {profile ? (
              <Link
                to="/profile"
                title={`${firstNameOf(profile.full_name)} — view profile`}
                className="wazen-interactive rounded-full outline-hidden hover:wazen-interactive-hover focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <WazenAvatar
                  fullName={profile.full_name}
                  gender={profile.gender}
                  lifeStage={profile.life_stage}
                  avatarUrl={profile.avatar_url}
                  size={36}
                />
              </Link>
            ) : null}
            <Button
              onClick={signOut}
              variant="ghost"
              size="icon"
              title={t("signOut")}
              aria-label={t("signOut")}
            >
              <SignOutIcon className="size-4" strokeWidth={ICON_STROKE} />
            </Button>
          </div>
        </div>
      </header>

      <WazenLocaleProvider language={profile?.language}>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">{children}</main>
      </WazenLocaleProvider>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-lifted backdrop-blur-xl sm:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-semibold transition-colors",
                location.pathname === to
                  ? "text-primary after:absolute after:top-0 after:h-0.5 after:w-8 after:rounded-full after:bg-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={ICON_STROKE} />
              {t(label)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
