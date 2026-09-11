import { Link, useLocation } from "@tanstack/react-router";
import { DashboardIcon, DocumentIcon, PortfolioIcon, ScheduledIcon, SettingsIcon, SignOutIcon, ZakatIcon, ICON_STROKE } from "@/components/wazen/icons";
import type { ReactNode } from "react";
import { useProfile, useSignOut } from "@/hooks/use-wazen-auth";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { Button } from "@/components/ui/button";
import { WazenLocaleProvider, useWazenLocale } from "@/components/wazen/WazenLocale";
import { PlanBadge } from "@/components/wazen/subscription/PlanBadge";
import { firstNameOf } from "@/lib/wazen";
import { canOwnAssets } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { WazenLogo } from "@/components/wazen/WazenLogo";
import { ZakatNotificationBell } from "@/components/wazen/zakat/ZakatNotificationBell";

// Core areas only. Account management (profile, subscription) lives in Settings.
const NAV = [
  { to: "/dashboard", label: "overview", icon: DashboardIcon },
  { to: "/recurring", label: "recurringNav", icon: ScheduledIcon },
  { to: "/documents", label: "documentsNav", icon: DocumentIcon },
  { to: "/assets", label: "assets", icon: PortfolioIcon, adultsOnly: true },
  { to: "/zakat", label: "zakat", icon: ZakatIcon, adultsOnly: true },
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
  // Account pages are reached from Settings, so they keep the Settings tab active.
  const SETTINGS_GROUP = ["/settings", "/profile", "/subscription"];
  const isActive = (to: string) =>
    to === "/settings" ? SETTINGS_GROUP.includes(location.pathname) : location.pathname === to;

  // Theme is applied globally by <ThemeSync /> in the root route.




  return (
    <div className={cn("min-h-screen bg-background", profile?.life_stage === "teenager" && "stage-teen", profile?.life_stage === "university_student" && "stage-university")}>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/85 shadow-soft backdrop-blur-xl">
        <div className="mx-auto grid h-[4.5rem] max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-8">
            <Link to="/dashboard" className="shrink-0" aria-label={t("overviewAria")}>
              <WazenMark />
            </Link>
            <nav className="hidden min-w-0 items-center gap-2 lg:flex xl:gap-6" aria-label={t("primaryNav")}>
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex h-[4.5rem] min-w-0 items-center gap-1.5 border-b-2 px-1 text-xs font-semibold transition-colors xl:gap-2 xl:text-sm",
                  isActive(to)
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={ICON_STROKE} />
                <span className="truncate">{t(label)}</span>
              </Link>
            ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <PlanBadge className="hidden lg:inline-flex" size="sm" />
            {profile ? (
              <ZakatNotificationBell lifeStage={profile.life_stage} currency={profile.base_currency} />
            ) : null}
            {profile ? (
              <Link
                to="/profile"
                title={`${firstNameOf(profile.full_name)} — ${t("viewProfileTitle")}`}
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
        <main className="mx-auto max-w-6xl px-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6 min-[375px]:px-4 sm:px-6 sm:pb-14 sm:pt-9 lg:px-8">{children}</main>
      </WazenLocaleProvider>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-lifted backdrop-blur-xl sm:hidden" aria-label={t("mobileNav")}>
        <div
          className="mx-auto grid max-w-md items-stretch"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        >
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-center text-[0.625rem] font-semibold leading-tight transition-colors",
                isActive(to)
                  ? "text-primary after:absolute after:top-0 after:h-0.5 after:w-8 after:rounded-full after:bg-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={ICON_STROKE} />
              <span className="line-clamp-2">{t(label)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
