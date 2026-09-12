import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { AnalyticsIcon, BankIcon, CheckIcon, EmergencyFundIcon, FamilyIcon, ForwardIcon, ICON_STROKE } from "@/components/wazen/icons";
import { WazenMark } from "@/components/wazen/AppShell";
import { WazenLogo } from "@/components/wazen/WazenLogo";
import { LanguageToggle } from "@/components/wazen/LanguageToggle";
import { ThemeToggle } from "@/components/wazen/ThemeToggle";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { Button } from "@/components/ui/button";

/** URL the landing-page QR code encodes — the published Wazen app. */
const WAZEN_URL = "https://wazenkw.lovable.app";

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
  { icon: FamilyIcon, title: "pillarStagesTitle", body: "pillarStagesBody" },
  { icon: EmergencyFundIcon, title: "pillarPrivacyTitle", body: "pillarPrivacyBody" },
  { icon: AnalyticsIcon, title: "pillarHabitsTitle", body: "pillarHabitsBody" },
] as const;

function Landing() {
  const { t } = useWazenLocale();
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <WazenMark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
          <Button asChild variant="ghost">
            <Link to="/auth"
              search={{ mode: "signin" as const }}
            >{t("signIn")}</Link>
          </Button>
        </div>
      </div></header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* Presentation-ready QR code — scan to open Wazen on a phone. */}
        <section className="flex flex-col items-center px-4 pt-10 pb-2 sm:pt-14" aria-label="Wazen QR code">
          <p className="font-display text-lg sm:text-2xl text-foreground" dir="rtl" lang="ar">
            امسح الـ QR Code ودش Wazen معانا 👇
          </p>
          <div className="mt-4 rounded-3xl bg-card p-4 sm:p-6 shadow-sm ring-1 ring-border/60">
            <div className="rounded-2xl bg-white p-3 sm:p-4">
              <QRCodeSVG
                value={WAZEN_URL}
                size={224}
                level="M"
                marginSize={2}
                className="h-44 w-44 sm:h-56 sm:w-56"
                aria-label={`QR code for ${WAZEN_URL}`}
              />
            </div>
          </div>
        </section>

        <section className="relative grid items-center py-14 sm:py-20">
          <div className="pointer-events-none absolute inset-y-6 end-0 hidden w-2/5 rounded-[2.5rem] bg-accent/60 lg:block" aria-hidden="true">
            <span className="absolute bottom-10 end-10 opacity-30">
              <WazenLogo size={110} />
            </span>
          </div>
          <div className="relative max-w-3xl wazen-enter">
          <p className="wazen-label">{t("landingEyebrow")}</p>
          <h1 className="mt-5">
            <WazenLogo size={92} />
            <span className="sr-only">Wazen</span>
          </h1>
          <p className="mt-6 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">{t("landingTagline")}</p>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("landingBody")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link
              to="/auth"
              search={{ mode: "signup" as const }}
            >
              {t("createAccount")}
              <ForwardIcon className="size-4" strokeWidth={ICON_STROKE} />
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
                <Icon className="size-5" strokeWidth={ICON_STROKE} />
              </span>
              <h2 className="mt-5 text-xl">{t(title)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </article>
          ))}
        </section>

        <section className="wazen-card wazen-enter" aria-labelledby="future-heading">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <BankIcon className="size-5" strokeWidth={ICON_STROKE} />
            </span>
            <div className="min-w-0">
              <p className="wazen-label">{t("futureEyebrow")}</p>
              <h2 id="future-heading" className="mt-1 text-xl">{t("futureTitle")}</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("futureBody")}</p>
          <p className="mt-5 wazen-label">{t("futurePlanned")}</p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {[t("futureItem1"), t("futureItem2"), t("futureItem3"), t("futureItem4")].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={ICON_STROKE} />
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border/70 pt-4 text-xs text-muted-foreground">{t("futureDisclaimer")}</p>
        </section>
      </main>
    </div>
  );
}
