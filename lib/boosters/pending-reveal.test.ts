import { beforeEach, describe, expect, it, vi } from "vitest";

// The marker lives in module memory: each test starts from a fresh module, as a refresh, a
// direct link or a new tab does.
async function freshMarker() {
  vi.resetModules();
  return import("@/lib/boosters/pending-reveal");
}

describe("pending reveal marker", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("answers yes for a marked draw, and still yes on a second read (StrictMode renders twice)", async () => {
    const { markPendingReveal, isRevealPending } = await freshMarker();

    markPendingReveal("draw-1");

    expect(isRevealPending("draw-1")).toBe(true);
    expect(isRevealPending("draw-1")).toBe(true);
  });

  it.each([
    { label: "nothing is marked (refresh, direct link or new tab)", marked: null },
    { label: "another draw is marked", marked: "draw-2" },
  ])("answers no when $label", async ({ marked }) => {
    const { markPendingReveal, isRevealPending } = await freshMarker();
    if (marked) markPendingReveal(marked);

    expect(isRevealPending("draw-1")).toBe(false);
  });

  it("answers no once the marker is consumed (Forward, or a second visit in the same tab)", async () => {
    const { markPendingReveal, isRevealPending, consumePendingReveal } = await freshMarker();
    markPendingReveal("draw-1");

    consumePendingReveal("draw-1");

    expect(isRevealPending("draw-1")).toBe(false);
  });

  it("keeps the marker of the current draw when another draw is consumed", async () => {
    const { markPendingReveal, isRevealPending, consumePendingReveal } = await freshMarker();
    markPendingReveal("draw-1");

    consumePendingReveal("draw-2");

    expect(isRevealPending("draw-1")).toBe(true);
  });
});
