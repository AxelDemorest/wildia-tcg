import { describe, expect, it } from "vitest";
import { cardShine, compareRarity } from "@/lib/cards/rarity";
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

describe("cardShine", () => {
  it("leaves common and uncommon cards matte", () => {
    expect(cardShine("common")).toBe("none");
    expect(cardShine("uncommon")).toBe("none");
  });

  it("gives rare and epic cards a static reflection", () => {
    expect(cardShine("rare")).toBe("static");
    expect(cardShine("epic")).toBe("static");
  });

  it("makes legendary and mythic cards shine on hover", () => {
    expect(cardShine("legendary")).toBe("hover");
    expect(cardShine("mythic")).toBe("hover");
  });

  it("never lets a rarer card shine less than a more common one", () => {
    const level = { none: 0, static: 1, hover: 2 } as const;
    const sorted = [...CARD_RARITIES].sort(compareRarity);
    for (let i = 1; i < sorted.length; i++) {
      expect(level[cardShine(sorted[i])]).toBeGreaterThanOrEqual(level[cardShine(sorted[i - 1])]);
    }
  });
});
