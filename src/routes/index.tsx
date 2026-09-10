import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, ShieldCheck, Sprout } from "lucide-react";
import { WazenMark } from "@/components/wazen/AppShell";
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
  {
    icon: Sprout,
    title: "Built for every life stage",
    body: "Children, teenagers, university students, employees and the self-employed each get an experience that fits.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Your profile and family links are protected at the database level, not just in the interface.",
  },
  {
    icon: LineChart,
    title: "Habits, not spreadsheets",
    body: "Gentle guidance and financial education that grows with you over time.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between border-b border-border px-5 sm:px-8">
        <WazenMark />
        <Button asChild variant="ghost">
          <Link to="/auth"
            search={{ mode: "signin" as const }}
          >Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="relative grid min-h-[62vh] items-end border-b border-border py-14 sm:min-h-[68vh] sm:py-20">
          <div className="absolute inset-y-0 end-0 hidden w-2/5 border-s border-border lg:block" aria-hidden="true">
            <div className="grid h-full grid-cols-3">
              <span className="border-e border-border/70" />
              <span className="border-e border-border/70" />
            </div>
            <div className="absolute inset-x-0 top-1/3 border-t border-border/70" />
            <div className="absolute inset-x-0 top-2/3 border-t border-border/70" />
            <div className="absolute bottom-10 end-10 font-display text-8xl text-gold/25">W.</div>
          </div>
          <div className="relative max-w-3xl wazen-enter">
          <p className="wazen-label">Personal finance & financial education</p>
          <h1 className="mt-5 text-6xl leading-[0.92] sm:text-8xl">Wazen.</h1>
          <p className="mt-6 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">Balance your money with quiet confidence.</p>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Wazen brings clarity to saving, spending and learning — for you and for the whole
            family.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link
              to="/auth"
              search={{ mode: "signup" as const }}
            >
              Create your account
              <ArrowRight className="size-4" strokeWidth={1.5} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link
              to="/auth"
              search={{ mode: "signin" as const }}
            >
              Explore a demo account
              </Link>
            </Button>
          </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border-b border-border py-9 sm:border-b-0 sm:border-e sm:px-8 sm:first:ps-0 sm:last:border-e-0 sm:last:pe-0">
              <Icon className="size-6 text-gold" strokeWidth={1.25} />
              <h2 className="mt-5 text-xl">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
