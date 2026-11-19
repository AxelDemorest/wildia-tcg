import { describe, expect, it } from "vitest";
import { boosterPackLook } from "./booster-pack";

describe("boosterPackLook(slug)", () => {
  it("gives the premium booster the premium look", () => {
    expect(boosterPackLook("premium")).toBe("premium");
  });

  it("falls back to the standard look for an unknown slug", () => {
    expect(boosterPackLook("some-future-booster")).toBe("standard");
  });
});
