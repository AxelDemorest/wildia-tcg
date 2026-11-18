import "server-only";

import { parseOpenBoosterResult, type OpenBoosterResult } from "@/lib/boosters/open-result";
import { createClient } from "@/lib/supabase/server";

export type { DrawnCard, OpenBoosterResult } from "@/lib/boosters/open-result";

export async function openBoosterPack(
  userId: string,
  boosterId: string,
): Promise<OpenBoosterResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_booster_pack", {
    p_booster_id: boosterId,
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) {
      throw new Error("insufficient_balance");
    }
    throw new Error(error.message);
  }

  return parseOpenBoosterResult(data);
}

/** Opens an emplacement of the signed-in player's offre boutique for the given window. */
export async function openBoosterShopSlot(
  windowIndex: number,
  slotIndex: number,
): Promise<OpenBoosterResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_booster_shop_slot", {
    p_window_index: windowIndex,
    p_slot_index: slotIndex,
  });

  if (error) throw new Error(error.message);

  return parseOpenBoosterResult(data);
}
