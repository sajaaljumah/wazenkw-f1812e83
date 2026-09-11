/**
 * Reference-rate service interface.
 *
 * Wazen never calls an external price API and never scrapes the Kuwait Zakat
 * House site. Rates live in the `metal_rates` table and are read from there.
 * A later backend integration (handled outside this app) will write fresh rows
 * to that table, using `METAL_RATES_SOURCE_URL` / `METAL_RATES_API_KEY` when
 * they are configured — no code here needs to change for that to happen.
 */
import { createServerFn } from "@tanstack/react-start";

export type MetalRateDTO = {
  metal: "gold_24k" | "silver";
  price_per_gram: number;
  currency: string;
  as_of: string;
  source: string;
};

/** Latest stored gram price per metal, newest row first. */
export const getMetalRates = createServerFn({ method: "GET" }).handler(async (): Promise<{
  rates: MetalRateDTO[];
  /** True once an automated integration is configured for future updates. */
  integrationConfigured: boolean;
}> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("metal_rates")
    .select("metal, price_per_gram, currency, as_of, source")
    .order("as_of", { ascending: false });
  if (error) throw new Error(error.message);
  return {
    rates: (data ?? []) as unknown as MetalRateDTO[],
    integrationConfigured: Boolean(process.env['METAL_RATES_SOURCE_URL']),
  };
});
