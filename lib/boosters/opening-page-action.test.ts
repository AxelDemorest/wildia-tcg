import { describe, expect, it } from "vitest";
import { openingPageAction } from "@/lib/boosters/opening-page-action";

describe("openingPageAction", () => {
  it.each([
    {
      label: "not_found",
      outcome: { ok: false, error: "not_found" } as const,
      action: { kind: "not-found" },
    },
    {
      label: "unauthenticated",
      outcome: { ok: false, error: "unauthenticated" } as const,
      action: { kind: "login" },
    },
    {
      label: "failed",
      outcome: { ok: false, error: "failed" } as const,
      action: { kind: "shop", notice: "load-failed" },
    },
  ])("maps the loader outcome $label to the page action", ({ outcome, action }) => {
    expect(openingPageAction(outcome)).toEqual(action);
  });
});
