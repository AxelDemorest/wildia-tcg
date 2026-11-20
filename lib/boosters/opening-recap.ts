import { compareRarity } from "@/lib/cards/rarity";
import type { CardRarity } from "@/lib/cards/types";

/** The recap of an opening: duplicates grouped with a quantity, rarest first, first appearance kept at equal rarity. */
export function groupOpeningRecap<T extends { cardId: string; rarity: CardRarity }>(
  items: readonly T[],
): Array<T & { quantity: number }> {
  const groups = new Map<string, T & { quantity: number }>();
  for (const item of items) {
    const group = groups.get(item.cardId);
    if (group) {
      group.quantity += 1;
    } else {
      groups.set(item.cardId, { ...item, quantity: 1 });
    }
  }
  return [...groups.values()].sort((a, b) => compareRarity(b.rarity, a.rarity));
}
