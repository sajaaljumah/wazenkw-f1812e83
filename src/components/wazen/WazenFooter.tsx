import { cn } from "@/lib/utils";
import { useWazenLocale } from "@/components/wazen/WazenLocale";

/** Global Wazen footer — subtle, consistent across every screen. */
export function WazenFooter({ className }: { className?: string }) {
  const { isArabic } = useWazenLocale();
  const copyright = isArabic ? "© سجى الجمعه" : "© Saja Aljumah";

  return (
    <footer className={cn("px-6 pb-24 pt-10 text-center sm:pb-8", className)}>
      <p className="text-xs tracking-wide text-muted-foreground" dir="auto">
        {copyright}
      </p>
    </footer>
  );
}
