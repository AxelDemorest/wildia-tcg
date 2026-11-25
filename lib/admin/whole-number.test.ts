import { describe, expect, it } from "vitest";
import { wholeNumberIn } from "@/lib/admin/whole-number";

const bounds = { min: 0, max: 1000 };

describe("wholeNumberIn", () => {
  it("reads a string of digits within the bounds as a number", () => {
    expect(wholeNumberIn("30", bounds)).toBe(30);
  });

  it.each(["1.5", "5.0", "1e3", "", "abc", "-5"])("refuses the text %j", (raw) => {
    expect(wholeNumberIn(raw, bounds)).toBeNull();
  });

  it.each([5, null, undefined])("refuses %j, which is not a string", (raw) => {
    expect(wholeNumberIn(raw, bounds)).toBeNull();
  });
});
