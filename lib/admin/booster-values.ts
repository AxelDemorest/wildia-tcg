import { wholeNumberIn, type Bounds } from "@/lib/admin/whole-number";
import { CARD_RARITIES, type CardRarity } from "@/lib/cards/types";

/** A booster card's values: `T` for each number, a string in the form or a number once read. */
export type BoosterCard<T> = {
  costCoins: T;
  slots: T;
  shopWeight: T;
  isActive: boolean;
  rarityWeights: Record<CardRarity, T>;
};

/**
 * A booster définition as the Paramètres page shows and edits it: every rarity has a chance, 0
 * for one the définition does not list.
 */
export type BoosterSettings = { slug: string } & BoosterCard<number>;

/**
 * A value of a booster définition, as the historique des paramètres names it: its
 * booster_definitions column, or `rarity_weights.<rarity>` for one rarity's chance.
 */
export type BoosterField =
  "cost_coins" | "slots" | "shop_weight" | "is_active" | `rarity_weights.${CardRarity}`;

/** The values of a booster définition that are numbers: all but whether it is active. */
export type NumericBoosterField = Exclude<BoosterField, "is_active">;

export const BOOSTER_FIELDS: readonly BoosterField[] = [
  "cost_coins",
  "slots",
  "shop_weight",
  "is_active",
  ...CARD_RARITIES.map((rarity) => `rarity_weights.${rarity}` as const),
];

/** A value of a booster définition: a number, or whether it is active. */
export type BoosterValue = number | boolean;

/** The changes to a booster définition, by booster_definitions column: only the values given. */
export type BoosterChanges = {
  cost_coins?: number;
  slots?: number;
  shop_weight?: number;
  is_active?: boolean;
  /** The chances of the rarities given; the others keep theirs. */
  rarity_weights?: Partial<Record<CardRarity, number>>;
};

export function isBoosterField(value: unknown): value is BoosterField {
  return BOOSTER_FIELDS.some((field) => field === value);
}

/** One value per rarity, from common to mythic. */
export function byRarity<T>(valueOf: (rarity: CardRarity) => T): Record<CardRarity, T> {
  return {
    common: valueOf("common"),
    uncommon: valueOf("uncommon"),
    rare: valueOf("rare"),
    epic: valueOf("epic"),
    legendary: valueOf("legendary"),
    mythic: valueOf("mythic"),
  };
}

/**
 * A booster_definitions row as the database sends it: a numeric column may come as a number or
 * as a string ("150.0000"), and rarity_weights lists only the rarities the définition draws.
 */
export type BoosterRow = {
  slug: string;
  cost_coins: number | string;
  slots: number;
  shop_weight: number | string;
  is_active: boolean;
  rarity_weights: Partial<Record<CardRarity, number>>;
};

/** A booster définition as the page shows it; the seeded ones list no mythic chance: 0. */
export function boosterFromRow(row: BoosterRow): BoosterSettings {
  return {
    slug: row.slug,
    costCoins: Number(row.cost_coins),
    slots: row.slots,
    shopWeight: Number(row.shop_weight),
    isActive: row.is_active,
    rarityWeights: byRarity((rarity) => row.rarity_weights[rarity] ?? 0),
  };
}

/** A booster définition's values, by the field the historique des paramètres names each with. */
export function boosterFieldValues(booster: BoosterSettings): Record<BoosterField, BoosterValue> {
  const { rarityWeights } = booster;
  return {
    cost_coins: booster.costCoins,
    slots: booster.slots,
    shop_weight: booster.shopWeight,
    is_active: booster.isActive,
    "rarity_weights.common": rarityWeights.common,
    "rarity_weights.uncommon": rarityWeights.uncommon,
    "rarity_weights.rare": rarityWeights.rare,
    "rarity_weights.epic": rarityWeights.epic,
    "rarity_weights.legendary": rarityWeights.legendary,
    "rarity_weights.mythic": rarityWeights.mythic,
  };
}

/** The change that sets `field` to `value`; null when the value is not of the field's kind. */
export function boosterChange(field: BoosterField, value: BoosterValue): BoosterChanges | null {
  if (typeof value === "boolean") return field === "is_active" ? { is_active: value } : null;
  if (field === "cost_coins") return { cost_coins: value };
  if (field === "slots") return { slots: value };
  if (field === "shop_weight") return { shop_weight: value };
  const rarity = CARD_RARITIES.find((candidate) => field === `rarity_weights.${candidate}`);
  return rarity === undefined ? null : { rarity_weights: { [rarity]: value } };
}

/** The bounds of a booster's price, in coins. */
export const BOOSTER_PRICE: Bounds = { min: 1, max: 100_000 };
/** The bounds of the number of cards a booster holds. */
export const BOOSTER_SLOTS: Bounds = { min: 1, max: 10 };
/** The bounds of a booster's weight in the boutique's draw: at 0, it is never offered. */
export const BOOSTER_SHOP_WEIGHT: Bounds = { min: 0, max: 1_000 };
/** The bounds of each rarity's chance; a booster also needs one above 0. */
export const RARITY_CHANCE: Bounds = { min: 0, max: 1_000 };

function boundsOf(field: NumericBoosterField): Bounds {
  if (field === "cost_coins") return BOOSTER_PRICE;
  if (field === "slots") return BOOSTER_SLOTS;
  if (field === "shop_weight") return BOOSTER_SHOP_WEIGHT;
  return RARITY_CHANCE;
}

/** Why a value is refused; anything that is not a whole number is out of range. */
export type BoosterValueError = "out_of_range";

export type ParsedBoosterValue =
  { ok: true; value: number } | { ok: false; error: BoosterValueError };

/** A number of a booster définition as a form sends it, within its field's bounds. */
export function parseBoosterValue(field: NumericBoosterField, raw: unknown): ParsedBoosterValue {
  const value = wholeNumberIn(raw, boundsOf(field));
  return value === null ? { ok: false, error: "out_of_range" } : { ok: true, value };
}

/** Why a booster card is refused, by form field: only the fields refused. */
export type BoosterCardErrors = {
  costCoins?: BoosterValueError;
  slots?: BoosterValueError;
  shopWeight?: BoosterValueError;
  /** The rarities whose chance is refused. */
  rarityWeights?: Partial<Record<CardRarity, BoosterValueError>>;
  /** Every chance read, and all at 0: the booster could not draw a single card. */
  chances?: "no_positive_chance";
};

export type ParsedBoosterCard =
  { ok: true; values: BoosterCard<number> } | { ok: false; fields: BoosterCardErrors };

function isEveryChanceRead(
  chances: Record<CardRarity, number | null>,
): chances is Record<CardRarity, number> {
  return CARD_RARITIES.every((rarity) => chances[rarity] !== null);
}

/** A booster card as a form sends it, every value within its bounds; every refusal is reported. */
export function parseBoosterCard(form: BoosterCard<unknown>): ParsedBoosterCard {
  const costCoins = wholeNumberIn(form.costCoins, BOOSTER_PRICE);
  const slots = wholeNumberIn(form.slots, BOOSTER_SLOTS);
  const shopWeight = wholeNumberIn(form.shopWeight, BOOSTER_SHOP_WEIGHT);
  const chances = byRarity((rarity) => wholeNumberIn(form.rarityWeights[rarity], RARITY_CHANCE));
  const rarityWeights = isEveryChanceRead(chances) ? chances : null;

  const fields: BoosterCardErrors = {};
  if (costCoins === null) fields.costCoins = "out_of_range";
  if (slots === null) fields.slots = "out_of_range";
  if (shopWeight === null) fields.shopWeight = "out_of_range";
  if (rarityWeights === null) {
    fields.rarityWeights = Object.fromEntries(
      CARD_RARITIES.filter((rarity) => chances[rarity] === null).map(
        (rarity) => [rarity, "out_of_range"] as const,
      ),
    );
  } else if (!CARD_RARITIES.some((rarity) => rarityWeights[rarity] > 0)) {
    fields.chances = "no_positive_chance";
  }

  if (
    costCoins === null ||
    slots === null ||
    shopWeight === null ||
    rarityWeights === null ||
    fields.chances
  ) {
    return { ok: false, fields };
  }
  return {
    ok: true,
    values: { costCoins, slots, shopWeight, isActive: form.isActive, rarityWeights },
  };
}
