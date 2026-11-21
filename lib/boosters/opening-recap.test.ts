import { describe, expect, it } from "vitest";
import { groupOpeningRecap } from "@/lib/boosters/opening-recap";
import type { CardRarity } from "@/lib/cards/types";

type Drawn = { cardId: string; slug: string; rarity: CardRarity; name: string };

const renard: Drawn = { cardId: "c1", slug: "vulpes-vulpes", rarity: "common", name: "Renard" };
const blaireau: Drawn = { cardId: "c2", slug: "meles-meles", rarity: "uncommon", name: "Blaireau" };
const tigre: Drawn = { cardId: "c3", slug: "panthera-tigris", rarity: "epic", name: "Tigre" };

const asPairs = (groups: Array<Drawn & { quantity: number }>) =>
  groups.map((group) => [group.name, group.quantity]);

describe("groupOpeningRecap", () => {
  it("groups duplicates with a quantity, rarest first, and keeps card data", () => {
    const groups = groupOpeningRecap([renard, tigre, blaireau, renard, renard]);

    expect(asPairs(groups)).toEqual([
      ["Tigre", 1],
      ["Blaireau", 1],
      ["Renard", 3],
    ]);
    expect(groups[0]).toMatchObject({ cardId: "c3", slug: "panthera-tigris", rarity: "epic" });
    expect(groups[2]).toMatchObject({ cardId: "c1", slug: "vulpes-vulpes", rarity: "common" });
  });

  it("keeps first-appearance order between groups of equal rarity", () => {
    const renardLate = { ...renard, cardId: "c7" };
    const blaireauCommon: Drawn = { ...blaireau, cardId: "c3", rarity: "common" };

    const groups = groupOpeningRecap([renardLate, blaireauCommon, renardLate]);

    expect(asPairs(groups)).toEqual([
      ["Renard", 2],
      ["Blaireau", 1],
    ]);
  });

  it("does not mutate its input items", () => {
    const items = [
      { ...renard, packId: "p1" },
      { ...tigre, packId: "p1" },
      { ...renard, packId: "p2" },
    ];
    const snapshot = structuredClone(items);

    const groups = groupOpeningRecap(items);

    expect(items).toEqual(snapshot);
    expect(items.some((item) => "quantity" in item)).toBe(false);
    expect(groups.some((group) => items.includes(group))).toBe(false);
  });
});
