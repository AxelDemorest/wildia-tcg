import { describe, expect, it } from "vitest";
import { pickWeightedRarity } from "@/lib/boosters/pick-rarity";

const STANDARD: Record<string, number> = {
  common: 55,
  uncommon: 28,
  rare: 12,
  epic: 4,
  legendary: 1,
};

describe("pickWeightedRarity", () => {
  it("respects deterministic RNG at bucket boundaries", () => {
    const total = 100;
    expect(pickWeightedRarity(STANDARD, () => 0)).toBe("common");
    expect(pickWeightedRarity(STANDARD, () => 54.9 / total)).toBe("common");
    expect(pickWeightedRarity(STANDARD, () => 55 / total)).toBe("uncommon");
    expect(pickWeightedRarity(STANDARD, () => 99.9 / total)).toBe("legendary");
  });

  it("distribution roughly matches weights over many draws", () => {
    const counts: Record<string, number> = {};
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const r = pickWeightedRarity(STANDARD);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    const commonRate = (counts.common ?? 0) / n;
    expect(commonRate).toBeGreaterThan(0.45);
    expect(commonRate).toBeLessThan(0.65);
    expect((counts.legendary ?? 0) / n).toBeLessThan(0.03);
  });
});
