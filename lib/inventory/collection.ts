import { compareRarity } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";

export type CollectionCard = CatalogCard & { quantity: number };

export type CollectionSortOption = "rarity" | "name" | "quantity";

/**
 * Orders the binder: rarest first then by name (default), by name, or most copies first.
 * Returns a new array.
 */
export function sortCollection(
  items: readonly CollectionCard[],
  sort: CollectionSortOption,
): CollectionCard[] {
  const copy = [...items];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    case "quantity":
      return copy.sort((a, b) => b.quantity - a.quantity);
    case "rarity":
    default:
      return copy.sort((a, b) => {
        const byRarity = compareRarity(b.rarity, a.rarity);
        if (byRarity !== 0) return byRarity;
        return a.name.localeCompare(b.name, "fr");
      });
  }
}
