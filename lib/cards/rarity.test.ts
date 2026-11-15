import { describe, expect, it } from "vitest";
import { compareRarity } from "@/lib/cards/rarity";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";

describe("compareRarity", () => {
  it("orders common < uncommon < rare < epic < legendary < mythic", () => {
    const shuffled: CardRarity[] = ["epic", "mythic", "common", "legendary", "uncommon", "rare"];
    expect([...shuffled].sort(compareRarity)).toEqual([
      "common",
      "uncommon",
      "rare",
      "epic",
      "legendary",
      "mythic",
    ]);
  });

  it("knows every rarity of the catalogue", () => {
    for (const rarity of CARD_RARITIES) {
      expect(compareRarity(rarity, rarity)).toBe(0);
    }
  });
});
