import { cn } from "@/lib/utils";

/** Global Wazen footer — subtle, consistent across every screen. */
export function WazenFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("px-6 pb-24 pt-10 text-center sm:pb-8", className)}>
      <p className="text-xs tracking-wide text-muted-foreground" dir="auto">
        © Saja Aljumah © سجى الجمعه
      </p>
    </footer>
  );
}
