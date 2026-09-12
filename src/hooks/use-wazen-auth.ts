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
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
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
