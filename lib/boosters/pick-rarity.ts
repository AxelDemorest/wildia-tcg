import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";

export type RarityWeights = Partial<Record<CardRarity, number>>;

/** Picks a rarity from weights; mirrors SQL pick_weighted_rarity with injectable RNG. */
export function pickWeightedRarity(
  weights: RarityWeights,
  random: () => number = Math.random,
): CardRarity {
  const entries = CARD_RARITIES
    .map((rarity) => [rarity, weights[rarity] ?? 0] as const)
    .filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return "common";

  let roll = random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return entries[entries.length - 1][0];
}
