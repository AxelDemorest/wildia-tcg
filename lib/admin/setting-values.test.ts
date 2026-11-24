import { describe, expect, it } from "vitest";
import { parseSettingValue } from "@/lib/admin/setting-values";

describe("parseSettingValue", () => {
  it.each([
    ["farm_global_multiplier", "0", 0],
    ["farm_global_multiplier", "5", 5],
    ["farm_global_multiplier", "0.25", 0.25],
    ["booster_shop_slot_count", "1", 1],
    ["booster_shop_slot_count", "12", 12],
  ] as const)("accepts %s = %j as the number %d", (setting, raw, value) => {
    expect(parseSettingValue(setting, raw)).toEqual({ ok: true, value });
  });

  it.each(["-0.1", "5.01", "", "abc", "1e0", "Infinity", "1,5"])(
    "refuses the multiplier %j as out of range",
    (raw) => {
      expect(parseSettingValue("farm_global_multiplier", raw)).toEqual({
        ok: false,
        error: "out_of_range",
      });
    },
  );

  it("refuses a multiplier written with more than two decimals as too precise", () => {
    expect(parseSettingValue("farm_global_multiplier", "1.234")).toEqual({
      ok: false,
      error: "too_precise",
    });
  });

  it.each(["0", "13", "8.0"])("refuses the slot count %j as out of range", (raw) => {
    expect(parseSettingValue("booster_shop_slot_count", raw)).toEqual({
      ok: false,
      error: "out_of_range",
    });
  });
});
