import type { CardRarity } from "@/lib/cards/types";

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

/** Reads the JSON returned by the open_booster_shop_slot RPC; throws on an unexpected shape. */
export function parseOpenBoosterResult(data: unknown): OpenBoosterResult {
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
