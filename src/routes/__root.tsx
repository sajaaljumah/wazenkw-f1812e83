import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { WazenFooter } from "@/components/wazen/WazenFooter";
import { AppLocaleProvider } from "@/components/wazen/WazenLocale";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { ThemeSync } from "@/components/wazen/WazenTheme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  const { t } = useWazenLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md border-y border-border py-12 text-center">
        <p className="wazen-label">404</p>
        <h1 className="mt-4 text-4xl text-foreground">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFoundBody")}</p>
        <div className="mt-6">
          <Button asChild><Link to="/">{t("goHome")}</Link></Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useWazenLocale();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md border-y border-border py-12 text-center">
        <h1 className="text-3xl text-foreground">{t("pageErrorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pageErrorBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            {t("tryAgain")}
          </Button>
          <Button asChild variant="outline"><a href="/">{t("goHome")}</a></Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wazen — Personal Finance & Financial Education" },
      {
        name: "description",
        content:
          "Wazen helps you and your family build healthier financial habits at every life stage.",
      },
      { property: "og:title", content: "Wazen" },
      {
        property: "og:description",
        content: "Personal finance and financial education for every life stage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync({ queryClient }: { queryClient: QueryClient }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      queueMicrotask(() => {
        if (!active) return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync queryClient={queryClient} />
      <ThemeSync />
      <AppLocaleProvider>
        <Toaster position="top-center" />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <WazenFooter />
      </AppLocaleProvider>
    </QueryClientProvider>
  );
}
