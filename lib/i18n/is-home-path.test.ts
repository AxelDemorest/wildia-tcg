import { describe, expect, it } from "vitest";
import { isHomePath } from "@/lib/i18n/is-home-path";

describe("isHomePath", () => {
  it.each(["/", "/fr", "/en", "/fr/", ""])("is true for %j", (path) => {
    expect(isHomePath(path)).toBe(true);
  });

  it.each(["/fr/cards", "/en/boosters", "/de", "/francais"])("is false for %j", (path) => {
    expect(isHomePath(path)).toBe(false);
  });
});
