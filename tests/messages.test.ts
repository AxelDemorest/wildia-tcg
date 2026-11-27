import { describe, expect, it } from "vitest";
import type { OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

type ErrorCode = Extract<OpenShopSlotOutcome<unknown>, { ok: false }>["error"];

// A code added to the action's outcome fails typecheck here until it is listed.
const errorCodes: Record<ErrorCode, true> = {
  invalid: true,
  unauthenticated: true,
  rate_limited: true,
  insufficient_balance: true,
  slot_not_found: true,
  slot_exhausted: true,
  window_closed: true,
  booster_unavailable: true,
  failed: true,
};

function flatKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Boosters messages", () => {
  it.each(
    Object.keys(errorCodes).flatMap((code) => [
      ["fr", code],
      ["en", code],
    ]),
  )("has a non-empty %s message for the error code %s", (locale, code) => {
    const messages = (locale === "fr" ? fr : en) as unknown as {
      Boosters: { error: Record<string, unknown> };
    };
    const message = messages.Boosters.error[code];
    expect(typeof message === "string" && message.trim().length > 0).toBe(true);
  });

  it("has the same keys in fr and en", () => {
    // The error.* keys are checked code by code above.
    const keys = (messages: unknown) =>
      flatKeys(messages).filter((key) => !key.startsWith("error."));
    expect(keys(en.Boosters).sort()).toEqual(keys(fr.Boosters).sort());
  });
});
