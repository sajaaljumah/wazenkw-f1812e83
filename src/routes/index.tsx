import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, ShieldCheck, Sprout } from "lucide-react";
import { WazenMark } from "@/components/wazen/AppShell";
import { LanguageToggle } from "@/components/wazen/LanguageToggle";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wazen — Personal Finance & Financial Education" },
      {
        name: "description",
        content:
          "Wazen helps families and individuals build healthier financial habits, with guidance tailored to every life stage.",
      },
      { property: "og:title", content: "Wazen — Personal Finance & Financial Education" },
      {
        property: "og:description",
        content:
          "Balance your money with confidence. Wazen adapts to children, teens, students, employees and the self-employed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  { icon: Sprout, title: "pillarStagesTitle", body: "pillarStagesBody" },
  { icon: ShieldCheck, title: "pillarPrivacyTitle", body: "pillarPrivacyBody" },
  { icon: LineChart, title: "pillarHabitsTitle", body: "pillarHabitsBody" },
] as const;

function Landing() {
  const { t } = useWazenLocale();
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between border-b border-border px-5 sm:px-8">
        <WazenMark />
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <Button asChild variant="ghost">
            <Link to="/auth"
              search={{ mode: "signin" as const }}
            >{t("signIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="relative grid items-center py-14 sm:py-20">
          <div className="pointer-events-none absolute inset-y-6 end-0 hidden w-2/5 rounded-[2.5rem] bg-accent/60 lg:block" aria-hidden="true">
            <div className="absolute bottom-12 end-12 font-display text-8xl font-extrabold text-primary/25">W.</div>
          </div>
          <div className="relative max-w-3xl wazen-enter">
          <p className="wazen-label">{t("landingEyebrow")}</p>
          <h1 className="mt-5 text-6xl leading-[0.92] sm:text-8xl">Wazen.</h1>
          <p className="mt-6 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">{t("landingTagline")}</p>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("landingBody")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link
              to="/auth"
              search={{ mode: "signup" as const }}
            >
              {t("createAccount")}
              <ArrowRight className="size-4" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link
              to="/auth"
              search={{ mode: "signin" as const }}
            >
              {t("exploreDemo")}
              </Link>
            </Button>
          </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="wazen-card">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <Icon className="size-5" strokeWidth={1.5} />
              </span>
              <h2 className="mt-5 text-xl">{t(title)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
