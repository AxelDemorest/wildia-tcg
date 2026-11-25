import { describe, expect, it } from "vitest";
import {
  boosterChange,
  boosterFromRow,
  parseBoosterCard,
  type BoosterChanges,
  type BoosterField,
  type BoosterValue,
} from "@/lib/admin/booster-values";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";

// A booster card as the form sends it: every value a string, the active switch a boolean.
type CardForm = {
  costCoins: unknown;
  slots: unknown;
  shopWeight: unknown;
  isActive: boolean;
  rarityWeights: Record<CardRarity, unknown>;
};

const validCard: CardForm = {
  costCoins: "450",
  slots: "5",
  shopWeight: "30",
  isActive: true,
  rarityWeights: {
    common: "35",
    uncommon: "30",
    rare: "20",
    epic: "10",
    legendary: "5",
    mythic: "0",
  },
};

function card(overrides: Partial<Omit<CardForm, "rarityWeights">> = {}) {
  return { ...validCard, ...overrides };
}

function cardWithChance(rarity: CardRarity, raw: unknown) {
  return { ...validCard, rarityWeights: { ...validCard.rarityWeights, [rarity]: raw } };
}

describe("parseBoosterCard", () => {
  it("reads a whole card as typed values", () => {
    expect(parseBoosterCard(validCard)).toEqual({
      ok: true,
      values: {
        costCoins: 450,
        slots: 5,
        shopWeight: 30,
        isActive: true,
        rarityWeights: { common: 35, uncommon: 30, rare: 20, epic: 10, legendary: 5, mythic: 0 },
      },
    });
  });

  it.each([true, false])("reads the active switch as %s", (isActive) => {
    const result = parseBoosterCard(card({ isActive }));

    expect(result.ok && result.values.isActive).toBe(isActive);
  });

  it.each(["1", "100000"])("accepts a price of %s coins", (raw) => {
    const result = parseBoosterCard(card({ costCoins: raw }));

    expect(result.ok && result.values.costCoins).toBe(Number(raw));
  });

  it.each(["0", "100001"])("refuses a price of %s coins as out of range", (raw) => {
    expect(parseBoosterCard(card({ costCoins: raw }))).toEqual({
      ok: false,
      fields: { costCoins: "out_of_range" },
    });
  });

  it.each(["1", "5", "10"])("accepts %s cards per booster", (raw) => {
    const result = parseBoosterCard(card({ slots: raw }));

    expect(result.ok && result.values.slots).toBe(Number(raw));
  });

  it.each(["0", "11"])("refuses %j cards per booster", (raw) => {
    expect(parseBoosterCard(card({ slots: raw }))).toEqual({
      ok: false,
      fields: { slots: "out_of_range" },
    });
  });

  it.each(["0", "1000", "70"])("accepts a shop weight of %s", (raw) => {
    const result = parseBoosterCard(card({ shopWeight: raw }));

    expect(result.ok && result.values.shopWeight).toBe(Number(raw));
  });

  it.each(["1001"])("refuses a shop weight of %j", (raw) => {
    expect(parseBoosterCard(card({ shopWeight: raw }))).toEqual({
      ok: false,
      fields: { shopWeight: "out_of_range" },
    });
  });

  it.each(CARD_RARITIES.flatMap((rarity) => ["0", "1000"].map((raw) => [rarity, raw] as const)))(
    "accepts the %s chance %s",
    (rarity, raw) => {
      // Another rarity stays positive: the card has a positive chance either way.
      const base = rarity === "common" ? "uncommon" : "common";
      const result = parseBoosterCard({
        ...cardWithChance(rarity, raw),
        rarityWeights: { ...cardWithChance(rarity, raw).rarityWeights, [base]: "1" },
      });

      expect(result.ok && result.values.rarityWeights[rarity]).toBe(Number(raw));
    },
  );

  it.each(CARD_RARITIES.flatMap((rarity) => ["1001"].map((raw) => [rarity, raw] as const)))(
    "refuses the %s chance %j, naming that rarity only",
    (rarity, raw) => {
      expect(parseBoosterCard(cardWithChance(rarity, raw))).toEqual({
        ok: false,
        fields: { rarityWeights: { [rarity]: "out_of_range" } },
      });
    },
  );

  it("refuses six chances at 0 as having no positive chance", () => {
    const zeros = Object.fromEntries(CARD_RARITIES.map((rarity) => [rarity, "0"])) as Record<
      CardRarity,
      unknown
    >;

    expect(parseBoosterCard({ ...validCard, rarityWeights: zeros })).toEqual({
      ok: false,
      fields: { chances: "no_positive_chance" },
    });
  });

  it("accepts a single positive chance", () => {
    const zeros = Object.fromEntries(CARD_RARITIES.map((rarity) => [rarity, "0"])) as Record<
      CardRarity,
      unknown
    >;

    const result = parseBoosterCard({ ...validCard, rarityWeights: { ...zeros, mythic: "1" } });

    expect(result.ok).toBe(true);
  });

  it("reports every invalid field at once", () => {
    expect(
      parseBoosterCard({
        ...validCard,
        costCoins: "0",
        slots: "11",
        shopWeight: "1001",
        rarityWeights: { ...validCard.rarityWeights, rare: "-1", epic: "0.5" },
      }),
    ).toEqual({
      ok: false,
      fields: {
        costCoins: "out_of_range",
        slots: "out_of_range",
        shopWeight: "out_of_range",
        rarityWeights: { rare: "out_of_range", epic: "out_of_range" },
      },
    });
  });
});

describe("boosterFromRow", () => {
  it("reads the numeric columns as numbers", () => {
    expect(
      boosterFromRow({
        slug: "standard",
        cost_coins: "150.0000",
        slots: 5,
        shop_weight: "70.0000",
        is_active: true,
        rarity_weights: { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1, mythic: 2 },
      }),
    ).toEqual({
      slug: "standard",
      costCoins: 150,
      slots: 5,
      shopWeight: 70,
      isActive: true,
      rarityWeights: { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1, mythic: 2 },
    });
  });

  it("gives a rarity the row does not list a chance of 0, as the seeded boosters lack mythic", () => {
    const booster = boosterFromRow({
      slug: "premium",
      cost_coins: 500,
      slots: 5,
      shop_weight: 30,
      is_active: false,
      rarity_weights: { common: 35, uncommon: 30, rare: 20, epic: 10, legendary: 5 },
    });

    expect(booster.rarityWeights).toEqual({
      common: 35,
      uncommon: 30,
      rare: 20,
      epic: 10,
      legendary: 5,
      mythic: 0,
    });
    expect(booster.isActive).toBe(false);
  });
});

describe("boosterChange", () => {
  it.each([
    ["cost_coins", 450, { cost_coins: 450 }],
    ["slots", 4, { slots: 4 }],
    ["shop_weight", 30, { shop_weight: 30 }],
    ["is_active", false, { is_active: false }],
    ["rarity_weights.common", 7, { rarity_weights: { common: 7 } }],
    ["rarity_weights.mythic", 3, { rarity_weights: { mythic: 3 } }],
  ] as [BoosterField, BoosterValue, BoosterChanges][])(
    "sets %s to %j alone",
    (field, value, changes) => {
      expect(boosterChange(field, value)).toEqual(changes);
    },
  );

  it.each([
    ["cost_coins", true],
    ["slots", false],
    ["shop_weight", true],
    ["rarity_weights.rare", false],
    ["is_active", 1],
  ] as [BoosterField, BoosterValue][])("has no change of %s to %j", (field, value) => {
    expect(boosterChange(field, value)).toBeNull();
  });
});
