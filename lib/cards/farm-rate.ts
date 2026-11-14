import type { CardRarity, CardStats } from "@/lib/cards/types";

/**
 * Coins per second per copy owned (see docs/economy.md).
 * Hourly targets: 4.17 / 6.25 / 9.38 / 14.58 / 22.92 / 35.42.
 * Six decimals match `cards.farm_rate_base` numeric(14, 6).
 */
export const FARM_RATE_BY_RARITY: Readonly<Record<CardRarity, number>> = {
  common: 0.001158,
  uncommon: 0.001736,
  rare: 0.002606,
  epic: 0.00405,
  legendary: 0.006367,
  mythic: 0.009839,
};

export const DEFAULT_CARD_STATS: Readonly<CardStats> = { power: 0, defense: 0, speed: 0 };
