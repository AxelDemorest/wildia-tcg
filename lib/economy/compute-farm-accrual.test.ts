import { describe, expect, it } from "vitest";
import { aggregateFarmRate, computeFarmAccrual } from "@/lib/economy/compute-farm-accrual";

describe("computeFarmAccrual", () => {
  it("floors rate × time × multiplier", () => {
    expect(computeFarmAccrual(1.5, 60, 1)).toBe(90);
    expect(computeFarmAccrual(0.55, 100, 1)).toBe(55);
  });

  it("returns 0 when no time or no rate", () => {
    expect(computeFarmAccrual(5, 0)).toBe(0);
    expect(computeFarmAccrual(0, 60)).toBe(0);
  });
});

describe("aggregateFarmRate", () => {
  it("sums rate × quantity across cards", () => {
    const rate = aggregateFarmRate([
      { farmRateBase: 0.5, quantity: 2 },
      { farmRateBase: 1.2, quantity: 1 },
    ]);
    expect(rate).toBe(2.2);
    expect(computeFarmAccrual(rate, 60)).toBe(132);
  });
});
