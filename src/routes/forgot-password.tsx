import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";

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
      <header className="mx-auto flex h-20 max-w-5xl items-center px-6">
        <Link to="/">
          <WazenMark />
        </Link>
      </header>
      <main className="mx-auto max-w-md px-4 pb-20 sm:px-6">
        <section className="wazen-panel p-6 sm:p-9">
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
                  className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Send reset link
              </button>
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
