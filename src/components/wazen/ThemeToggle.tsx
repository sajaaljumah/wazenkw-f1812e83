import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useProfile, useSession } from "@/hooks/use-wazen-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  applyTheme,
  cacheGuestTheme,
  cacheTheme,
  readGuestTheme,
  resolveTheme,
} from "@/components/wazen/WazenTheme";
import { cn } from "@/lib/utils";

/**
 * Universal theme switch for public pages and inside the app (adults & children).
 * Toggles immediately and syncs with the active profile when signed in.
 */
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { t } = useWazenLocale();
  const { user } = useSession();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof document !== "undefined") {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    } else {
      setTheme(resolveTheme(profile?.theme ?? readGuestTheme() ?? "light"));
    }
  }, [profile?.theme]);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);

    if (user?.id) {
      cacheTheme(user.id, next);
      void supabase
        .from("profiles")
        .update({ theme: next })
        .eq("id", user.id)
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ["profile"] });
        });
    } else {
      cacheGuestTheme(next);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      className={cn(
        "transition-colors rounded-lg",
        showLabel ? "gap-1.5 px-2 text-xs sm:gap-2 sm:text-sm font-medium" : "size-9",
        className
      )}
      onClick={toggle}
      aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
      title={theme === "dark" ? t("lightMode") : t("darkMode")}
    >
      {theme === "dark" ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-300 hover:rotate-90 shrink-0" strokeWidth={ICON_STROKE} />
      ) : (
        <Moon className="size-4 text-indigo-600 dark:text-indigo-400 transition-transform duration-300 hover:-rotate-12 shrink-0" strokeWidth={ICON_STROKE} />
      )}
      {showLabel ? (
        <span className="hidden md:inline">
          {theme === "dark" ? t("lightMode") : t("darkMode")}
        </span>
      ) : null}
    </Button>
  );
}
