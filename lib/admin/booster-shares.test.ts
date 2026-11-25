import { describe, expect, it } from "vitest";
import { formatShare, rarityTotal, slotShares } from "@/lib/admin/booster-shares";

// Intl writes a fr percentage with a no-break space (U+00A0) before the sign.
const NBSP = " ";

describe("rarityTotal", () => {
  it("adds the six chances", () => {
    expect(
      rarityTotal({ common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1, mythic: 0 }),
    ).toBe(100);
  });
});

describe("formatShare", () => {
  it("writes 55 out of 100 as 55 %", () => {
    expect(formatShare(55, 100, "fr")).toBe(`55${NBSP}%`);
    expect(formatShare(55, 100, "en")).toBe("55%");
  });

  it("writes a third with one decimal, in the locale's format", () => {
    expect(formatShare(1, 3, "fr")).toBe(`33,3${NBSP}%`);
    expect(formatShare(1, 3, "en")).toBe("33.3%");
  });

  it("writes 0 % for a total of 0, in both locales", () => {
    expect(formatShare(0, 0, "fr")).toBe(`0${NBSP}%`);
    expect(formatShare(0, 0, "en")).toBe("0%");
  });
});

describe("slotShares", () => {
  const standard = { slug: "standard", shopWeight: 70, isActive: true };
  const premium = { slug: "premium", shopWeight: 30, isActive: true };

  it("shares the emplacements by shop weight", () => {
    expect(slotShares([standard, premium], "fr")).toEqual({
      standard: `70${NBSP}%`,
      premium: `30${NBSP}%`,
    });
  });

  it("gives an inactive booster 0 % and leaves it out of the others' total", () => {
    expect(slotShares([standard, { ...premium, isActive: false }], "en")).toEqual({
      standard: "100%",
      premium: "0%",
    });
  });
});
