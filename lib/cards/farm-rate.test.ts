import { describe, expect, it } from "vitest";
import { FARM_RATE_BY_RARITY } from "@/lib/cards/farm-rate";

const COINS_PER_HOUR: Record<keyof typeof FARM_RATE_BY_RARITY, number> = {
  common: 4.17,
  uncommon: 6.25,
  rare: 9.38,
  epic: 14.58,
  legendary: 22.92,
  mythic: 35.42,
};

describe("FARM_RATE_BY_RARITY", () => {
  it("matches the configured coins-per-hour table", () => {
    for (const [rarity, coinsPerHour] of Object.entries(COINS_PER_HOUR)) {
      const rate = FARM_RATE_BY_RARITY[rarity as keyof typeof FARM_RATE_BY_RARITY];
      expect(rate * 3600).toBeCloseTo(coinsPerHour, 2);
    }
  });
});
