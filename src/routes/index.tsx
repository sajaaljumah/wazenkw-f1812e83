import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AnalyticsIcon,
  CheckIcon,
  EmergencyFundIcon,
  FamilyIcon,
  ForwardIcon,
  ICON_STROKE,
} from "@/components/wazen/icons";
import { WazenMark } from "@/components/wazen/AppShell";
import { WazenLogo } from "@/components/wazen/WazenLogo";
import { LanguageToggle } from "@/components/wazen/LanguageToggle";
import { ThemeToggle } from "@/components/wazen/ThemeToggle";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { Button } from "@/components/ui/button";

const DEFAULT_APP_URL = "https://wazenkw-f1812e83.onrender.com";

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
  const { t, isArabic } = useWazenLocale();
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setAppUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <WazenMark />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Button asChild variant="ghost" className="text-sm font-medium">
              <Link to="/auth" search={{ mode: "signin" as const }}>
                {t("signIn")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {/* HERO SECTION WITH EMBEDDED QR SHOWCASE CARD */}
        <section className="grid items-center gap-10 py-12 lg:grid-cols-12 lg:gap-14 lg:py-20">
          {/* Main Copy & CTAs */}
          <div className="relative z-10 flex flex-col justify-center lg:col-span-7 wazen-enter">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-accent/60 px-3.5 py-1.5 text-xs font-semibold text-primary border border-primary/10">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              {t("landingEyebrow")}
            </div>

            <h1 className="mt-5">
              <WazenLogo size={96} />
              <span className="sr-only">Wazen</span>
            </h1>

            <p className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl text-foreground">
              {t("landingTagline")}
            </p>

            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              {t("landingBody")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button asChild size="lg" className="h-12 px-6 text-base font-semibold shadow-md gap-2">
                <Link to="/auth" search={{ mode: "signup" as const }}>
                  {t("createAccount")}
                  <ForwardIcon className="size-4" strokeWidth={ICON_STROKE} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base font-semibold">
                <Link to="/auth" search={{ mode: "signin" as const }}>
                  {t("exploreDemo")}
                </Link>
              </Button>
            </div>

            {/* Feature Badges */}
            <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-border/60 pt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-emerald-500" strokeWidth={ICON_STROKE} />
                {isArabic ? "مجاني وسهل الاستخدام" : "Free & intuitive"}
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-emerald-500" strokeWidth={ICON_STROKE} />
                {isArabic ? "خصوصية تامة وحماية عائلية" : "Private & family safe"}
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-emerald-500" strokeWidth={ICON_STROKE} />
                {isArabic ? "يعمل على الهاتف والحاسوب" : "Responsive on any screen"}
              </span>
            </div>
          </div>

          {/* THE PINK/ACCENT CARD WITH EMBEDDED QR CODE */}
          <div className="lg:col-span-5 wazen-enter">
            <div className="relative flex flex-col items-center justify-center rounded-[2.5rem] bg-accent/40 p-6 sm:p-8 border border-primary/15 shadow-soft backdrop-blur-sm overflow-hidden text-center">
              {/* Subtle decorative watermark logo in corner */}
              <span className="pointer-events-none absolute -bottom-6 -end-6 opacity-15" aria-hidden="true">
                <WazenLogo size={140} />
              </span>

              {/* Title above QR */}
              <p className="text-base font-bold text-foreground mb-1 relative z-10">
                {isArabic ? "امسح الـ QR Code ودش وازن 📱" : "Scan QR code to open Wazen 📱"}
              </p>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs relative z-10">
                {isArabic
                  ? "افتح كاميرا هاتفك وامسح الكود لفتح أحدث نسخة من التطبيق مباشرة"
                  : "Open your camera to launch the latest version directly"}
              </p>

              {/* QR Code container */}
              <div className="rounded-3xl bg-card p-4 sm:p-5 shadow-sm ring-1 ring-border/80 relative z-10 transition-transform hover:scale-[1.02] duration-300">
                <div className="rounded-2xl bg-white p-3 sm:p-4">
                  <QRCodeSVG
                    value={appUrl}
                    size={210}
                    level="M"
                    marginSize={2}
                    className="h-44 w-44 sm:h-52 sm:w-52"
                    aria-label={`QR code for ${appUrl}`}
                  />
                </div>
              </div>

              {/* Live Version Indicator */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground relative z-10">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[240px] dir-ltr text-left font-mono text-[11px]">
                  {appUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS SECTION */}
        <section className="grid gap-5 sm:grid-cols-3 pt-6">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="wazen-card transition-all duration-300 hover:shadow-lifted hover:-translate-y-0.5"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <Icon className="size-5" strokeWidth={ICON_STROKE} />
              </span>
              <h2 className="mt-5 text-xl font-semibold">{t(title)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
            </article>
          ))}
        </section>
      </main>

      {/* MINIMAL CLEAN FOOTER */}
      <footer className="border-t border-border/60 bg-card/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <WazenMark />
            <span>—</span>
            <span>{isArabic ? "جميع الحقوق محفوظة © وازن" : "All rights reserved © Wazen"}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" search={{ mode: "signin" as const }} className="hover:text-foreground transition-colors">
              {t("signIn")}
            </Link>
            <Link to="/auth" search={{ mode: "signup" as const }} className="hover:text-foreground transition-colors">
              {t("createAccount")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
