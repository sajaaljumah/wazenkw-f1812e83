import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-wazen-auth";
import { getMyEntitlements } from "@/lib/subscription.functions";
import {
  FREE_ENTITLEMENTS,
  hasFeature,
  type Entitlements,
  type PremiumFeature,
} from "@/lib/subscription";

/**
 * Entitlements come from the server (never from client-held state), so the UI
 * and the backend always agree on what the user may access.
 */
export function useEntitlements() {
  const { user, loading } = useSession();
  const fetchEntitlements = useServerFn(getMyEntitlements);
  return useQuery({
    queryKey: ["entitlements", user?.id],
    enabled: !loading && !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Entitlements> => await fetchEntitlements(),
  });
}

/** Convenience wrapper: safe defaults to the free plan while loading. */
export function useSubscriptionAccess() {
  const { data, isLoading, isError, refetch } = useEntitlements();
  const entitlements = data ?? FREE_ENTITLEMENTS;
  return {
    entitlements,
    isLoading,
    isError,
    refetch,
    isPremium: entitlements.isPremium,
    /** Family subscription seat role, when the user belongs to a family. */
    seatRole: entitlements.seatRole,
    /** False for children/teenagers: they never see checkout or payment. */
    canSubscribe: entitlements.canSubscribe,
    canManageBilling: entitlements.canManageBilling,
    family: entitlements.family,
    can: (feature: PremiumFeature) => hasFeature(entitlements, feature),
  };
}
