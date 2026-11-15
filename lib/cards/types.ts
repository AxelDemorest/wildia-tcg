export const CARD_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
] as const;

export type CardRarity = (typeof CARD_RARITIES)[number];

/** Face de carte (species, rarity, art) or dos de carte (brand visual only). */
export type CardSide = "front" | "back";

/** Global IUCN Red List categories, least to most threatened, then unassessed. */
export const IUCN_STATUSES = ["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD", "NE"] as const;

export type IucnStatus = (typeof IUCN_STATUSES)[number];

export type CardStats = {
  power: number;
  defense: number;
  speed: number;
};

export type CardTranslationRow = {
  locale: string;
  name: string;
  description: string;
};

export type CardRow = {
  id: string;
  slug: string;
  scientific_name: string | null;
  iucn_status: IucnStatus | null;
  rarity: CardRarity;
  image_path: string | null;
  farm_rate_base: number;
  stats: CardStats;
};

export type CatalogCard = CardRow & {
  name: string;
  description: string;
};
