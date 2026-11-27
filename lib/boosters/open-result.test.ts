import { describe, expect, it } from "vitest";
import { parseOpenBoosterResult } from "@/lib/boosters/open-result";

describe("parseOpenBoosterResult", () => {
  it("maps the RPC JSON to the app's shape, numbers included", () => {
    const result = parseOpenBoosterResult({
      draw_id: "d1",
      balance: "850.0000",
      cost: 150,
      roll_seed: "ignored",
      cards: [
        { card_id: "c1", slug: "vulpes-vulpes", rarity: "common" },
        { card_id: "c2", slug: "panthera-tigris", rarity: "epic" },
      ],
    });

    expect(result).toEqual({
      drawId: "d1",
      balance: 850,
      cost: 150,
      cards: [
        { cardId: "c1", slug: "vulpes-vulpes", rarity: "common" },
        { cardId: "c2", slug: "panthera-tigris", rarity: "epic" },
      ],
    });
  });

  it("rejects a response that is not an object", () => {
    expect(() => parseOpenBoosterResult(null)).toThrow("Invalid open response");
    expect(() => parseOpenBoosterResult("ok")).toThrow("Invalid open response");
  });

  it("rejects a response without a card list", () => {
    expect(() => parseOpenBoosterResult({ draw_id: "d1", cards: null })).toThrow(
      "Invalid cards payload",
    );
  });
});
