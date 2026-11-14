import "server-only";

import { createClient } from "@/lib/supabase/server";

export type EconomySnapshot = {
  balance: number;
  accrued: number;
  deltaSeconds: number;
};

function parseSnapshot(data: unknown): EconomySnapshot {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid sync response");
  }
  const row = data as Record<string, unknown>;
  return {
    balance: Number(row.balance ?? 0),
    accrued: Number(row.accrued ?? 0),
    deltaSeconds: Number(row.delta_seconds ?? 0),
  };
}

/** Sync lazy farm then return current balance. */
export async function syncUserEconomy(userId: string): Promise<EconomySnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sync_user_economy", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseSnapshot(data);
}
