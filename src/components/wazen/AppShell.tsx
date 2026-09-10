import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import type { ReactNode } from "react";
import { useProfile, useSignOut } from "@/hooks/use-wazen-auth";
import { WazenAvatar } from "@/components/wazen/WazenAvatar";
import { firstNameOf } from "@/lib/wazen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function WazenMark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl tracking-tight", className)} style={{ fontFamily: "var(--font-display)" }}>
      Wazen
      <span className="text-gold">.</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const signOut = useSignOut();
  const { data: profile } = useProfile();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="shrink-0">
            <WazenMark />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  location.pathname === to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Icon className="size-4" strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {profile ? (
              <Link
                to="/profile"
                title={`${firstNameOf(profile.full_name)} — view profile`}
                className="wazen-interactive rounded-full outline-none hover:wazen-interactive-hover focus-visible:ring-2 focus-visible:ring-ring/60"
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
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <LogOut className="size-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-6 sm:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur sm:hidden">
        <div className="flex items-stretch justify-around">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
                location.pathname === to ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
