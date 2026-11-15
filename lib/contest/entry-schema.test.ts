import { describe, expect, it } from "vitest";
import { parseContestEmail } from "@/lib/contest/entry-schema";

describe("parseContestEmail", () => {
  it("normalizes case and spaces, so a second entry is seen as a duplicate", () => {
    expect(parseContestEmail("  Nohan@Example.FR ")).toBe("nohan@example.fr");
  });

  it.each([["pas-un-email"], [""], ["a@b"], [42], [null], [undefined]])("refuses %j", (value) => {
    expect(parseContestEmail(value)).toBeNull();
  });

  it("refuses an address longer than 254 characters", () => {
    const local = "a".repeat(64);
    const fits = `${local}@${"b".repeat(60)}.fr`;
    const tooLong = `${local}@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.${"e".repeat(10)}.fr`;

    expect(tooLong.length).toBeGreaterThan(254);
    expect(parseContestEmail(fits)).toBe(fits);
    expect(parseContestEmail(tooLong)).toBeNull();
  });
});
