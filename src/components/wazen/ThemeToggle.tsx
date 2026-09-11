import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICON_STROKE } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import {
  applyTheme,
  cacheGuestTheme,
  readGuestTheme,
  resolveTheme,
} from "@/components/wazen/WazenTheme";
import { cn } from "@/lib/utils";

/**
 * Theme switch for the public screens (landing, sign in, sign up).
 * The choice applies immediately and is carried into the app once the visitor
 * signs in, where it becomes that account's saved preference.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useWazenLocale();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(resolveTheme(readGuestTheme() ?? "light"));
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    cacheGuestTheme(next);
    applyTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-2", className)}
      onClick={toggle}
      aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
    >
      {theme === "dark" ? (
        <Sun className="size-4" strokeWidth={ICON_STROKE} />
      ) : (
        <Moon className="size-4" strokeWidth={ICON_STROKE} />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? t("lightMode") : t("darkMode")}
      </span>
    </Button>
  );
}
