import { describe, expect, it } from "vitest";
import { parseShopNotice, shopNoticeHref } from "./shop-notice";

describe("parseShopNotice", () => {
  it.each(["already-opened", "load-failed"] as const)(
    "returns the known notice %s as is",
    (notice) => {
      expect(parseShopNotice(notice)).toBe(notice);
    },
  );

  it("returns null for an unknown or a missing value", () => {
    expect(parseShopNotice("something-else")).toBeNull();
    expect(parseShopNotice(null)).toBeNull();
  });
});

describe("shopNoticeHref", () => {
  it("builds the shop URL of the given locale carrying the notice", () => {
    expect(shopNoticeHref("fr", "already-opened")).toBe("/fr/boosters?notice=already-opened");
    expect(shopNoticeHref("en", "load-failed")).toBe("/en/boosters?notice=load-failed");
  });
});
