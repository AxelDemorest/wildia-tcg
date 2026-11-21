import { describe, expect, it } from "vitest";
import { isPrimaryPress } from "@/lib/boosters/pointer-press";

describe("isPrimaryPress(press)", () => {
  it.each([
    ["the primary button of a primary pointer", { button: 0, isPrimary: true }, true],
    ["a middle click", { button: 1, isPrimary: true }, false],
    ["a right click", { button: 2, isPrimary: true }, false],
    ["a non-primary pointer", { button: 0, isPrimary: false }, false],
  ])("for %s, starts the charge: %s", (_, press, starts) => {
    expect(isPrimaryPress(press)).toBe(starts);
  });
});
