import "server-only";

import { parseBoosterShopOffer, type BoosterShopOffer } from "@/lib/boosters/shop";
import { createClient } from "@/lib/supabase/server";

export type { BoosterShopOffer, BoosterShopSlot } from "@/lib/boosters/shop";

/** The signed-in player's offre boutique for the current fenêtre boutique, drawn on first read. */
export async function getBoosterShopOffer(): Promise<BoosterShopOffer> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booster_shop_offer");

  if (error) throw new Error(error.message);

  return parseBoosterShopOffer(data);
}
