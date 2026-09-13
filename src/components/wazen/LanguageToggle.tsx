import { LanguageIcon, ICON_STROKE } from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Language switch for all users across public screens and the app header.
 * Instantly toggles between Arabic and English and updates user preferences.
 */
export function LanguageToggle({
  className,
  showLabel = true,
  compact = false,
}: {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}) {
  const { language, setLanguage } = useWazenLocale();
  const nextLang = language === "ar" ? "en" : "ar";
  const label = language === "ar" ? "English" : "العربية";
  const shortLabel = language === "ar" ? "EN" : "عربي";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "transition-colors rounded-lg",
        compact ? "h-9 gap-1 px-2 text-xs font-semibold" : "gap-1.5 px-2 text-xs sm:gap-2 sm:text-sm font-medium",
        className
      )}
      onClick={() => setLanguage(nextLang)}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <LanguageIcon className="size-4 text-muted-foreground transition-transform duration-200 hover:scale-110 shrink-0" strokeWidth={ICON_STROKE} />
      {compact ? (
        <span className="font-semibold text-xs">{shortLabel}</span>
      ) : showLabel ? (
        <>
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden font-semibold">{shortLabel}</span>
        </>
      ) : null}
    </Button>
  );
}
