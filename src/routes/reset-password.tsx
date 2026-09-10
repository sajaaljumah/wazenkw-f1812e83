import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WazenMark } from "@/components/wazen/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new Wazen password" },
      { name: "description", content: "Set a new password for your Wazen account." },
      { property: "og:title", content: "Choose a new Wazen password" },
      { property: "og:description", content: "Set a new password for your Wazen account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
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
          <h1 className="text-3xl">Choose a new password</h1>
          {!ready ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Open this page from the reset link in your email to continue.
            </p>
          ) : null}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="wazen-label">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="wazen-field mt-2"
              />
            </label>
            <label className="block">
              <span className="wazen-label">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="wazen-field mt-2"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || !ready}
              size="lg"
              className="w-full"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
