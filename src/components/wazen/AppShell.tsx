import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Settings, Sparkles, User } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useProfile, useSignOut } from "@/hooks/use-wazen-auth";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { Button } from "@/components/ui/button";
import { WazenLocaleProvider } from "@/components/wazen/WazenLocale";
import { firstNameOf } from "@/lib/wazen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subscription", label: "Plan", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function WazenMark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl", className)}>
      Wazen
      <span className="text-gold">.</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const signOut = useSignOut();
  const { data: profile } = useProfile();
  const isArabic = profile?.language === "ar";

  useEffect(() => {
    document.documentElement.lang = isArabic ? "ar" : "en";
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.documentElement.classList.toggle("dark", profile?.theme === "dark");
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      document.documentElement.classList.remove("dark");
    };
  }, [isArabic, profile?.theme]);

  const labels = isArabic
    ? { Dashboard: "الرئيسية", Plan: "الاشتراك", Profile: "الملف الشخصي", Settings: "الإعدادات", signOut: "تسجيل الخروج" }
    : { Dashboard: "Overview", Plan: "Plan", Profile: "Profile", Settings: "Settings", signOut: "Sign out" };

  return (
    <div className={cn("min-h-screen bg-background", profile?.life_stage === "teenager" && "stage-teen", profile?.life_stage === "university_student" && "stage-university")}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-8">
            <Link to="/dashboard" className="shrink-0" aria-label="Wazen overview">
              <WazenMark />
            </Link>
            <nav className="hidden items-center gap-6 sm:flex" aria-label="Primary navigation">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex h-[4.5rem] items-center gap-2 border-b-2 px-1 text-sm font-medium transition-colors",
                  location.pathname === to
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.7} />
                {labels[label]}
              </Link>
            ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
              title={labels.signOut}
              aria-label={labels.signOut}
            >
              <LogOut className="size-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </header>

      <WazenLocaleProvider language={profile?.language}>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">{children}</main>
      </WazenLocaleProvider>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-medium",
                location.pathname === to ? "text-foreground after:absolute after:top-0 after:h-0.5 after:w-8 after:bg-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
              {labels[label]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
