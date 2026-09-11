import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SpinnerIcon } from "@/components/wazen/icons";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your Wazen password" },
      { name: "description", content: "Request a password reset link for your Wazen account." },
      { property: "og:title", content: "Reset your Wazen password" },
      { property: "og:description", content: "Request a password reset link for your Wazen account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-6xl items-center border-b border-border px-5 sm:px-8">
        <Link to="/">
          <WazenMark />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-4 pb-20 sm:px-6">
        <section className="border-y border-border py-9">
          <h1 className="text-3xl">Forgot your password?</h1>
          {sent ? (
            <p className="mt-4 text-sm text-muted-foreground">
              If an account exists for {email}, a reset link is on its way. Open it to choose a new
              password.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="wazen-label">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="wazen-field mt-2"
                />
              </label>
              <Button
                type="submit"
                disabled={busy}
                size="lg"
                className="w-full"
              >
                {busy ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          )}
          <Link
            to="/auth"
            search={{ mode: "signin" as const }}
            className="mt-6 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    </div>
  );
}
