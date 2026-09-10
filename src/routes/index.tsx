import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LineChart, ShieldCheck, Sprout } from "lucide-react";
import { WazenMark } from "@/components/wazen/AppShell";

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
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
        <WazenMark />
        <Link
          to="/auth"
            search={{ mode: "signin" as const }}
          className="rounded-full border border-border px-5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="pt-10 sm:pt-20">
          <p className="wazen-label">Personal finance & financial education</p>
          <h1 className="mt-5 max-w-2xl text-4xl leading-tight sm:text-6xl">
            Balance your money with quiet confidence.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Wazen brings clarity to saving, spending and learning — for you and for the whole
            family.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" as const }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90"
            >
              Create your account
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </Link>
            <Link
              to="/auth"
            search={{ mode: "signin" as const }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm transition-colors hover:bg-secondary"
            >
              Explore a demo account
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="wazen-panel p-7">
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
