import { describe, expect, it } from "vitest";
import { boosterPackLook, drawPackSlug } from "./booster-pack";

describe("boosterPackLook(slug)", () => {
  it("gives the premium booster the premium look", () => {
    expect(boosterPackLook("premium")).toBe("premium");
  });

  it("falls back to the standard look for an unknown slug", () => {
    expect(boosterPackLook("some-future-booster")).toBe("standard");
  });
});

describe("drawPackSlug(booster)", () => {
  it.each([
    [{ slug: "premium" }, "premium"],
    [null, "standard"],
  ])("gives the pack of a draw whose booster is %j the slug %s", (booster, slug) => {
    expect(drawPackSlug(booster)).toBe(slug);
  });
});
