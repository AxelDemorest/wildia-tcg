import { describe, expect, it } from "vitest";
import { parsePage, parseSearchTerm } from "@/lib/admin/accounts-query";

describe("parseSearchTerm", () => {
  it("trims the term", () => {
    expect(parseSearchTerm("  Léa  ")).toBe("Léa");
  });

  it("gives an empty term when the param is absent", () => {
    expect(parseSearchTerm(undefined)).toBe("");
  });

  it("gives an empty term when the param is repeated", () => {
    expect(parseSearchTerm(["léa", "bob"])).toBe("");
  });

  it("cuts a long term at 100 characters", () => {
    expect(parseSearchTerm("a".repeat(150))).toBe("a".repeat(100));
  });

  it("does not split an emoji when it cuts at 100 characters", () => {
    const term = "a".repeat(99) + "🦊";

    expect(parseSearchTerm(term)).toBe(term);
    expect(parseSearchTerm(term + "b")).toBe(term);
  });
});

describe("parsePage", () => {
  it("reads a page number", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("keeps page 1,000,000, the last one allowed", () => {
    expect(parsePage("1000000")).toBe(1_000_000);
  });

  it.each([
    ["absent", undefined],
    ["zero", "0"],
    ["negative", "-1"],
    ["followed by letters", "2abc"],
    ["a decimal", "1.5"],
    ["repeated", ["2", "3"]],
    ["beyond the safe integers", "9007199254740993"],
    ["in exponent notation", "1e2"],
    ["in hexadecimal", "0x10"],
    ["just above 1,000,000", "1000001"],
  ])("falls back to page 1 when the param is %s", (_label, value) => {
    expect(parsePage(value)).toBe(1);
  });
});
