import { describe, expect, it, vi } from "vitest";
import { boosterName } from "@/lib/admin/booster-name";

/** The `Boosters.pack` translator: next-intl's `t(key)` and `t.has(key)`, over these messages. */
function packTranslator(messages: Record<string, string>) {
  const t = vi.fn((key: string) => {
    if (!(key in messages)) throw new Error(`MISSING_MESSAGE: ${key}`);
    return messages[key];
  });
  const has = vi.fn((key: string) => key in messages);
  return Object.assign(t, { has });
}

describe("boosterName", () => {
  it("gives the short name of a booster that has one", () => {
    const t = packTranslator({ "premium.short": "Premium" });

    expect(boosterName("premium", t)).toBe("Premium");
    expect(t).toHaveBeenCalledWith("premium.short");
  });

  it("gives the slug of a booster without a short name, without asking for the missing message", () => {
    const t = packTranslator({ "premium.short": "Premium" });

    expect(boosterName("test-promo", t)).toBe("test-promo");
    expect(t.has).toHaveBeenCalledWith("test-promo.short");
    expect(t).not.toHaveBeenCalled();
  });
});
