import { describe, expect, it } from "vitest";
import { initials } from "@/lib/profiles/initials";

// The contract under test:
//   // lib/profiles/initials.ts
//   initials(name: string): string
// The registry rule of Accounts.dc.html: keep letters (A-Za-zÀ-ÿ) and spaces, take the first letter
// of each word, at most 2, upper-cased; when nothing is left, the first character, upper-cased.

describe("initials", () => {
  it.each([
    ["77", "7"],
    ["🦊", "🦊"],
    ["jean pierre martin", "JP"],
    ["12 Monkeys", "M"],
    ["Jean  Pierre", "JP"],
  ])("gives the initials of %j: %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
