import { describe, expect, it, vi } from "vitest";
import {
  openShopSlotErrorCode,
  openShopSlotInputSchema,
  runOpenShopSlot,
} from "@/lib/boosters/open-shop-slot";

describe("openShopSlotInputSchema", () => {
  it("reads locale, windowIndex and slotIndex from FormData strings and converts the indexes to integers", () => {
    const result = openShopSlotInputSchema.parse({
      locale: "fr",
      windowIndex: "9876543",
      slotIndex: "2",
    });

    expect(result).toEqual({ locale: "fr", windowIndex: 9876543, slotIndex: 2 });
  });

  it("does not carry a boosterId: the booster comes from the stored offre, not from the client", () => {
    const result = openShopSlotInputSchema.parse({
      locale: "fr",
      windowIndex: "9876543",
      slotIndex: "0",
      boosterId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).not.toHaveProperty("boosterId");
  });
});

describe("openShopSlotInputSchema, invalid input", () => {
  const valid = { locale: "fr", windowIndex: "9876543", slotIndex: "2" };

  it.each([
    ["negative", "-1"],
    ["decimal", "1.5"],
    ["non-numeric", "abc"],
    ["empty", ""],
    ["missing (FormData.get gives null)", null],
    ["absent", undefined],
  ])("rejects a %s slotIndex", (_label, slotIndex) => {
    expect(openShopSlotInputSchema.safeParse({ ...valid, slotIndex }).success).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["missing (FormData.get gives null)", null],
    ["absent", undefined],
    ["non-numeric", "abc"],
    ["decimal", "1.5"],
  ])("rejects a %s windowIndex", (_label, windowIndex) => {
    expect(openShopSlotInputSchema.safeParse({ ...valid, windowIndex }).success).toBe(false);
  });

  it.each(["windowIndex", "slotIndex"])("rejects a %s that is not a safe integer", (field) => {
    for (const value of ["9007199254740993", "9".repeat(400)]) {
      expect(openShopSlotInputSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
    }
  });

  it("rejects a negative windowIndex", () => {
    expect(openShopSlotInputSchema.safeParse({ ...valid, windowIndex: "-1" }).success).toBe(false);
  });

  it("still accepts slot index 0", () => {
    expect(openShopSlotInputSchema.safeParse({ ...valid, slotIndex: "0" }).success).toBe(true);
  });
});

describe("openShopSlotErrorCode", () => {
  it.each([
    "insufficient_balance",
    "slot_not_found",
    "slot_exhausted",
    "window_closed",
    "booster_unavailable",
  ])("maps the RPC message %s to the same stable code", (message) => {
    expect(openShopSlotErrorCode(message)).toBe(message);
  });

  it.each([
    "something broke",
    "not authenticated",
    "x slot_exhausted",
    "slot_exhausted ",
    "insufficient_balance: details",
    "",
  ])("maps the unknown message %j to failed, matching by exact equality only", (message) => {
    expect(openShopSlotErrorCode(message)).toBe("failed");
  });
});

describe("runOpenShopSlot", () => {
  const input = { locale: "fr", windowIndex: "42", slotIndex: "1" };

  function makeDeps(overrides: Partial<Parameters<typeof runOpenShopSlot>[1]> = {}) {
    const calls: string[] = [];
    const deps = {
      getUserId: vi.fn(async () => {
        calls.push("getUserId");
        return "user-1" as string | null;
      }),
      checkRateLimit: vi.fn(async () => {
        calls.push("checkRateLimit");
        return true;
      }),
      openSlot: vi.fn(async () => {
        calls.push("openSlot");
        return { drawId: "draw-1" } as unknown;
      }),
      revalidate: vi.fn(() => {
        calls.push("revalidate");
      }),
      ...overrides,
    };
    return { deps, calls };
  }

  it("answers invalid, without rate limit nor RPC, for an input the schema rejects", async () => {
    const { deps } = makeDeps();

    const result = await runOpenShopSlot({ ...input, slotIndex: "" }, deps);

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
    expect(deps.openSlot).not.toHaveBeenCalled();
    expect(deps.revalidate).not.toHaveBeenCalled();
  });

  it("answers unauthenticated, without rate limit nor RPC, when there is no player", async () => {
    const { deps } = makeDeps({ getUserId: vi.fn(async () => null) });

    const result = await runOpenShopSlot(input, deps);

    expect(result).toEqual({ ok: false, error: "unauthenticated" });
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
    expect(deps.openSlot).not.toHaveBeenCalled();
  });

  it("answers rate_limited, without RPC, when the limit of that player is exceeded", async () => {
    const { deps } = makeDeps({ checkRateLimit: vi.fn(async () => false) });

    const result = await runOpenShopSlot(input, deps);

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(deps.checkRateLimit).toHaveBeenCalledWith("user-1");
    expect(deps.openSlot).not.toHaveBeenCalled();
    expect(deps.revalidate).not.toHaveBeenCalled();
  });

  it("answers the mapped code when the RPC fails, without revalidating", async () => {
    const { deps } = makeDeps({
      openSlot: vi.fn(async () => {
        throw new Error("slot_exhausted");
      }),
    });

    const result = await runOpenShopSlot(input, deps);

    expect(result).toEqual({ ok: false, error: "slot_exhausted" });
    expect(deps.revalidate).not.toHaveBeenCalled();
  });

  it("answers failed when the RPC throws something that is not a known message", async () => {
    const { deps } = makeDeps({
      openSlot: vi.fn(async () => {
        throw new Error("connection reset");
      }),
    });

    expect(await runOpenShopSlot(input, deps)).toEqual({ ok: false, error: "failed" });
  });

  it("answers failed when the RPC throws something that is not an Error", async () => {
    const { deps } = makeDeps({
      openSlot: vi.fn(async () => {
        throw "slot_exhausted";
      }),
    });

    expect(await runOpenShopSlot(input, deps)).toEqual({ ok: false, error: "failed" });
  });

  it("opens the parsed window and slot indexes, then revalidates the locale, and returns the result", async () => {
    const { deps, calls } = makeDeps();

    const result = await runOpenShopSlot(input, deps);

    expect(result).toEqual({ ok: true, result: { drawId: "draw-1" }, locale: "fr" });
    expect(deps.openSlot).toHaveBeenCalledWith(42, 1);
    expect(deps.revalidate).toHaveBeenCalledWith("fr", "user-1");
    expect(calls).toEqual(["getUserId", "checkRateLimit", "openSlot", "revalidate"]);
  });
});
