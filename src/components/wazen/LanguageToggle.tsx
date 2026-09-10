import { Languages } from "lucide-react";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Language switch for the public screens. Signed-in users change their saved
 * preference in Settings, which always wins over this device-level choice.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useWazenLocale();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-2", className)}
      onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
      aria-label={t("language")}
    >
      <Languages className="size-4" strokeWidth={1.5} />
      {language === "ar" ? t("english") : t("arabic")}
    </Button>
  );
}
