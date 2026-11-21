import { describe, expect, it } from "vitest";
import { computeCollectionStats, type CollectionStatsItem } from "@/lib/inventory/collection-stats";

function row(name: string, rarity: CollectionStatsItem["rarity"], quantity: number): CollectionStatsItem {
  return { name, rarity, quantity };
}

describe("computeCollectionStats", () => {
  const items = [
    row("A", "common", 3),
    row("B", "epic", 1),
    row("C", "mythic", 2),
  ];

  it("sums species, copies, catalog percent and rarity breakdown", () => {
    const stats = computeCollectionStats(items, 200, 12);
    expect(stats.uniqueSpecies).toBe(3);
    expect(stats.totalCopies).toBe(6);
    expect(stats.catalogPercent).toBe(1.5);
    expect(stats.rarityCounts.mythic).toBe(1);
    expect(stats.rarityCounts.common).toBe(1);
    expect(stats.boosterOpenCount).toBe(12);
  });

  it("picks the rarest owned species", () => {
    expect(computeCollectionStats(items, 10, null).rarestOwned).toEqual({
      name: "C",
      rarity: "mythic",
    });
  });

  it("hides booster opens when null", () => {
    expect(computeCollectionStats([], 0, null).boosterOpenCount).toBeNull();
  });
});