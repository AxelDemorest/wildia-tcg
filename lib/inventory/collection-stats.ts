import { compareRarity } from "@/lib/cards/rarity";
import type { CardRarity } from "@/lib/cards/types";

export type CollectionStatsItem = {
  rarity: CardRarity;
  quantity: number;
  name: string;
};

export type CollectionStats = {
  uniqueSpecies: number;
  totalCopies: number;
  catalogPercent: number;
  rarityCounts: Record<CardRarity, number>;
  rarestOwned: { name: string; rarity: CardRarity } | null;
  boosterOpenCount: number | null;
};

const RARITIES: CardRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

function emptyRarityCounts(): Record<CardRarity, number> {
  return Object.fromEntries(RARITIES.map((rarity) => [rarity, 0])) as Record<CardRarity, number>;
}

/** Aggregates binder rows into profile stats (pure; no I/O). */
export function computeCollectionStats(
  items: readonly CollectionStatsItem[],
  catalogSpeciesCount: number,
  boosterOpenCount: number | null,
): CollectionStats {
  const uniqueSpecies = items.length;
  const totalCopies = items.reduce((sum, row) => sum + row.quantity, 0);

  const rarityCounts = emptyRarityCounts();
  for (const row of items) {
    rarityCounts[row.rarity] += 1;
  }

  let rarestOwned: CollectionStats["rarestOwned"] = null;
  for (const row of items) {
    if (
      !rarestOwned ||
      compareRarity(row.rarity, rarestOwned.rarity) > 0 ||
      (compareRarity(row.rarity, rarestOwned.rarity) === 0 &&
        row.name.localeCompare(rarestOwned.name, "fr") < 0)
    ) {
      rarestOwned = { name: row.name, rarity: row.rarity };
    }
  }

  const catalogPercent =
    catalogSpeciesCount > 0
      ? Math.min(100, Math.round((uniqueSpecies / catalogSpeciesCount) * 1000) / 10)
      : 0;

  return {
    uniqueSpecies,
    totalCopies,
    catalogPercent,
    rarityCounts,
    rarestOwned,
    boosterOpenCount,
  };
}