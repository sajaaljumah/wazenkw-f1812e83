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
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { language, setLanguage, t } = useWazenLocale();
  const nextLang = language === "ar" ? "en" : "ar";
  const label = language === "ar" ? "English" : "العربية";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 px-2 text-xs sm:gap-2 sm:text-sm font-medium transition-colors", className)}
      onClick={() => setLanguage(nextLang)}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <LanguageIcon className="size-4 text-muted-foreground transition-transform duration-200 hover:scale-110" strokeWidth={ICON_STROKE} />
      {showLabel ? (
        <>
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden font-semibold">{language === "ar" ? "EN" : "عربي"}</span>
        </>
      ) : null}
    </Button>
  );
}
