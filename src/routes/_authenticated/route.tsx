import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "signin" as const } });
    
    // Strict guard against deleted accounts
    const u = data.user;
    const email = u.email?.toLowerCase();
    if (
      u.user_metadata?.is_deleted === true ||
      u.user_metadata?.account_status === "deleted" ||
      email?.includes("deleted.wazen") ||
      email?.startsWith("deleted-")
    ) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { mode: "signin" as const } });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
