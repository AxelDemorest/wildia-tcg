import { describe, expect, it } from "vitest";
import {
  SHOWCASE_SLOT_COUNT,
  showcaseSlotsFromRows,
  validateShowcaseSlotSelection,
} from "@/lib/profiles/showcase";

const A = "0b3a6f1e-2c4d-4e5f-8a9b-1c2d3e4f5a6b";
const B = "1b4b7f2e-3d5e-4f6a-9b0c-2d3e4f5a6b7c";

describe("showcaseSlotsFromRows", () => {
  it("fills missing slots with null", () => {
    expect(showcaseSlotsFromRows([{ slot: 2, card_id: A }])).toEqual([
      null,
      A,
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("validateShowcaseSlotSelection", () => {
  it("rejects duplicate cards across slots", () => {
    const slots = Array<string | null>(SHOWCASE_SLOT_COUNT).fill(null);
    slots[0] = A;
    slots[3] = A;
    expect(validateShowcaseSlotSelection(slots)).toEqual({ ok: false, reason: "duplicate" });
  });

  it("accepts distinct cards and empty slots", () => {
    const slots: (string | null)[] = [A, B, null, null, null, null];
    expect(validateShowcaseSlotSelection(slots)).toEqual({ ok: true });
  });
});