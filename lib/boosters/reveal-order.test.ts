import { describe, expect, it } from "vitest";
import { revealStackOrder } from "@/lib/boosters/reveal-order";
import type { CardRarity } from "@/lib/cards/types";

type Drawn = { cardId: string; slug: string; rarity: CardRarity; name: string };

const renard: Drawn = { cardId: "c1", slug: "vulpes-vulpes", rarity: "common", name: "Renard" };
const blaireau: Drawn = { cardId: "c2", slug: "meles-meles", rarity: "common", name: "Blaireau" };
const loup: Drawn = { cardId: "c5", slug: "canis-lupus", rarity: "uncommon", name: "Loup" };
const lynx: Drawn = { cardId: "c4", slug: "lynx-lynx", rarity: "rare", name: "Lynx" };
const tigreEpic: Drawn = { cardId: "c3", slug: "panthera-tigris", rarity: "epic", name: "Tigre" };
const tigreMythic: Drawn = { ...tigreEpic, rarity: "mythic" };

const names = (items: Drawn[]) => items.map((item) => item.name);

describe("revealStackOrder", () => {
  it.each([
    {
      label: "keeps a pack already sorted from common to mythic",
      input: [renard, loup, lynx, tigreEpic, { ...tigreMythic, cardId: "c9", name: "Dragon" }],
      expected: ["Renard", "Loup", "Lynx", "Tigre", "Dragon"],
    },
    {
      label: "reverses a pack given from mythic to common",
      input: [{ ...tigreMythic, name: "Dragon" }, tigreEpic, lynx, loup, renard],
      expected: ["Renard", "Loup", "Lynx", "Tigre", "Dragon"],
    },
    {
      label: "sorts a mixed pack, keeping draw order at equal rarity",
      input: [tigreEpic, renard, lynx, blaireau, loup],
      expected: ["Renard", "Blaireau", "Loup", "Lynx", "Tigre"],
    },
    {
      label: "keeps duplicates of a card as separate entries in draw order",
      input: [
        { ...renard, cardId: "c7" },
        { ...blaireau, cardId: "c3" },
        { ...renard, cardId: "c7" },
      ],
      expected: ["Renard", "Blaireau", "Renard"],
    },
    {
      label: "returns a one-card pack as is",
      input: [tigreMythic],
      expected: ["Tigre"],
    },
  ])("$label", ({ input, expected }) => {
    expect(names(revealStackOrder(input))).toEqual(expected);
  });

  it("does not mutate the input and returns a new array", () => {
    const input = [tigreEpic, renard];

    const result = revealStackOrder(input);

    expect(input).toEqual([tigreEpic, renard]);
    expect(result).not.toBe(input);
    expect(names(result)).toEqual(["Renard", "Tigre"]);
  });
});
