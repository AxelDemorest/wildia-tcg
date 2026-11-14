import "server-only";

import type { CardRarity } from "@/lib/cards/types";
import { createClient } from "@/lib/supabase/server";

export type DrawnCard = {
  cardId: string;
  slug: string;
  rarity: CardRarity;
};

export type OpenBoosterResult = {
  drawId: string;
  balance: number;
  cost: number;
  cards: DrawnCard[];
};

function parseResult(data: unknown): OpenBoosterResult {
  if (!data || typeof data !== "object") throw new Error("Invalid open response");
  const row = data as Record<string, unknown>;
  const cardsRaw = row.cards;
  if (!Array.isArray(cardsRaw)) throw new Error("Invalid cards payload");

  const cards: DrawnCard[] = cardsRaw.map((c) => {
    const item = c as Record<string, unknown>;
    return {
      cardId: String(item.card_id),
      slug: String(item.slug),
      rarity: String(item.rarity) as CardRarity,
    };
  });

  return {
    drawId: String(row.draw_id),
    balance: Number(row.balance),
    cost: Number(row.cost),
    cards,
  };
}

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

  return parseResult(data);
}
