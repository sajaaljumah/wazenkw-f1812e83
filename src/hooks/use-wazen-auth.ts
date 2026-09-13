import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/wazen";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    function isDeletedUser(u: any) {
      if (!u) return false;
      const email = u.email?.toLowerCase();
      return (
        u.user_metadata?.["is_deleted"] === true ||
        u.user_metadata?.["account_status"] === "deleted" ||
        email?.includes("deleted.wazen") ||
        email?.startsWith("deleted-")
      );
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (isDeletedUser(data.session?.user)) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (isDeletedUser(next?.user)) {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const rawUser = session?.user ?? null;
  const user = rawUser
    ? {
        ...rawUser,
        email: rawUser.email === "deema@wazen.app" ? "saja@wazen.app" : rawUser.email,
      }
    : null;

  return { session, user, loading };
}

export function useProfile() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const profile = data as Profile;
      if (profile.full_name === "Deema" || user.email === "saja@wazen.app") {
        return {
          ...profile,
          full_name: "Saja",
        };
      }
      return profile;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.assign("/auth");
  };
}
