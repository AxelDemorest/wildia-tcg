import { describe, expect, it } from "vitest";
import { parseBoosterShopOffer, pickWeightedBoosterType } from "@/lib/boosters/shop";

describe("parseBoosterShopOffer", () => {
  it("maps the RPC JSON of an offre boutique to the app's shape, numbers included", () => {
    const result = parseBoosterShopOffer({
      window_index: 9_876_543,
      ends_at: "2026-11-16T10:03:00+00:00",
      slots: [
        {
          slot_index: 0,
          exhausted: false,
          booster: { id: "b1", slug: "starter", cost_coins: "150.0000", slots: 5 },
        },
        {
          slot_index: 1,
          exhausted: true,
          booster: { id: "b2", slug: "premium", cost_coins: 400, slots: "7" },
        },
      ],
    });

    expect(result).toEqual({
      windowIndex: 9_876_543,
      endsAt: "2026-11-16T10:03:00+00:00",
      slots: [
        {
          slotIndex: 0,
          exhausted: false,
          booster: { id: "b1", slug: "starter", costCoins: 150, slots: 5 },
        },
        {
          slotIndex: 1,
          exhausted: true,
          booster: { id: "b2", slug: "premium", costCoins: 400, slots: 7 },
        },
      ],
    });
  });

  it("rejects an offre boutique response that is not an object", () => {
    expect(() => parseBoosterShopOffer(null)).toThrow("Invalid shop offer response");
    expect(() => parseBoosterShopOffer("ok")).toThrow("Invalid shop offer response");
  });

  it("rejects an offre boutique response without a list of emplacements", () => {
    expect(() =>
      parseBoosterShopOffer({ window_index: 1, ends_at: "2026-11-16T10:03:00+00:00", slots: null }),
    ).toThrow("Invalid shop slots payload");
  });
});

describe("tirage des types de booster (pickWeightedBoosterType)", () => {
  const candidates = [
    { id: "a", shopWeight: 1 },
    { id: "b", shopWeight: 2 },
    { id: "c", shopWeight: 1 },
  ];

  it("picks by weight interval in the given order: 0 gives the first, an exact bound the next, 0.999 the last", () => {
    expect(pickWeightedBoosterType(candidates, () => 0)?.id).toBe("a");
    expect(pickWeightedBoosterType(candidates, () => 0.2499)?.id).toBe("a");
    expect(pickWeightedBoosterType(candidates, () => 0.25)?.id).toBe("b");
    expect(pickWeightedBoosterType(candidates, () => 0.7499)?.id).toBe("b");
    expect(pickWeightedBoosterType(candidates, () => 0.75)?.id).toBe("c");
    expect(pickWeightedBoosterType(candidates, () => 0.999)?.id).toBe("c");
  });

  it("never picks a définition de booster with a weight of 0, even with a 0 roll when it comes first", () => {
    const withZeroFirst = [
      { id: "never", shopWeight: 0 },
      { id: "b", shopWeight: 1 },
    ];

    expect(pickWeightedBoosterType(withZeroFirst, () => 0)?.id).toBe("b");
    expect(pickWeightedBoosterType(withZeroFirst, () => 0.999)?.id).toBe("b");
  });

  it("returns null when no définition de booster has a positive weight, or the list is empty", () => {
    expect(pickWeightedBoosterType([], () => 0)).toBeNull();
    expect(
      pickWeightedBoosterType(
        [
          { id: "a", shopWeight: 0 },
          { id: "b", shopWeight: 0 },
        ],
        () => 0,
      ),
    ).toBeNull();
  });
});
