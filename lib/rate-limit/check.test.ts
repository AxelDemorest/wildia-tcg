import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimitStore } from "./check";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const window = 60_000;
    const t0 = 1_000_000;
    expect(checkRateLimit("k", 3, window, t0).allowed).toBe(true);
    expect(checkRateLimit("k", 3, window, t0 + 1).allowed).toBe(true);
    expect(checkRateLimit("k", 3, window, t0 + 2).allowed).toBe(true);
  });

  it("blocks when limit exceeded in the same window", () => {
    const window = 60_000;
    const t0 = 2_000_000;
    checkRateLimit("auth:1.2.3", 2, window, t0);
    checkRateLimit("auth:1.2.3", 2, window, t0 + 100);
    const third = checkRateLimit("auth:1.2.3", 2, window, t0 + 200);
    expect(third.allowed).toBe(false);
    if (!third.allowed) {
      expect(third.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("resets after the window elapses", () => {
    const window = 1_000;
    const t0 = 3_000_000;
    checkRateLimit("k2", 1, window, t0);
    const blocked = checkRateLimit("k2", 1, window, t0 + 10);
    expect(blocked.allowed).toBe(false);
    expect(checkRateLimit("k2", 1, window, t0 + window).allowed).toBe(true);
  });
});
