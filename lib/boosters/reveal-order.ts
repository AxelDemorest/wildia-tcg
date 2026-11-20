import { compareRarity } from "@/lib/cards/rarity";
import type { CardRarity } from "@/lib/cards/types";

/** The order a drawn pack is revealed in: from the most common to the rarest, draw order kept at equal rarity. */
export function revealStackOrder<T extends { rarity: CardRarity }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareRarity(a.rarity, b.rarity));
}
