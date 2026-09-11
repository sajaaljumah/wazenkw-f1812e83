import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import type { Asset, AssetValuation } from "@/lib/assets";

/** Assets are private to their owner; RLS enforces the same rule server-side. */
export function useAssets() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["assets", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user!.id)
        .order("purchase_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Asset[];
    },
  });
}

/** Recorded value history for every asset the signed-in user owns. */
export function useAssetValuations() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["asset-valuations", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<AssetValuation[]> => {
      const { data, error } = await supabase
        .from("asset_valuations")
        .select("id, asset_id, valued_on, unit_value")
        .order("valued_on", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AssetValuation[];
    },
  });
}

export type AssetInput = {
  kind: Asset["kind"];
  name: string;
  symbol: string | null;
  currency: string;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  current_unit_value: number;
  purity: string | null;
  property_type: string | null;
  monthly_rent: number;
  holding_purpose: string | null;
  notes: string | null;
};

function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["assets"] }),
      queryClient.invalidateQueries({ queryKey: ["asset-valuations"] }),
    ]);
  };
}

export function useSaveAsset() {
  const { user } = useSession();
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string | undefined; input: AssetInput }) => {
      if (id) {
        const { error } = await supabase.from("assets").update(input).eq("id", id);
        if (error) throw error;
        // Keep the value history in step with the latest recorded value.
        const { error: historyError } = await supabase
          .from("asset_valuations")
          .upsert(
            {
              asset_id: id,
              valued_on: new Date().toISOString().slice(0, 10),
              unit_value: input.current_unit_value,
            },
            { onConflict: "asset_id,valued_on" },
          );
        if (historyError) throw historyError;
        return id;
      }
      const { data, error } = await supabase
        .from("assets")
        .insert({ ...input, user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      const created = (data as { id: string }).id;
      await supabase.from("asset_valuations").insert([
        { asset_id: created, valued_on: input.purchase_date, unit_value: input.unit_cost },
        {
          asset_id: created,
          valued_on: new Date().toISOString().slice(0, 10),
          unit_value: input.current_unit_value,
        },
      ]);
      return created;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
