import { describe, expect, it } from "vitest";
import {
  createOfferReloader,
  formatCountdown,
  remainingSeconds,
  shouldReloadOffer,
} from "./shop-countdown";

// The page computes the seconds left on the server at render (endsAt - server now); the client
// counts down from that value with its own elapsed time, never from endsAt on the browser clock.
const RENDERED_AT = 1_700_000_000_000;

describe("remainingSeconds(secondsAtRender, renderedAtMs, nowMs)", () => {
  it.each([
    {
      name: "counts the elapsed client time",
      secondsAtRender: 65,
      elapsedMs: 10_000,
      expected: 55,
    },
    { name: "rounds a fraction up", secondsAtRender: 89.2, elapsedMs: 0, expected: 90 },
    {
      name: "never goes negative after the end",
      secondsAtRender: 0,
      elapsedMs: 5_000,
      expected: 0,
    },
  ])("$name → $expected", ({ secondsAtRender, elapsedMs, expected }) => {
    expect(remainingSeconds(secondsAtRender, RENDERED_AT, RENDERED_AT + elapsedMs)).toBe(expected);
  });
});

describe("formatCountdown(seconds)", () => {
  it("pads the seconds: 65 → 1:05", () => {
    expect(formatCountdown(65)).toBe("1:05");
  });
});

// shouldReloadOffer({ secondsLeft, windowIndex, lastReload, nowMs }): should the page ask the
// server for the offer again now? `lastReload` is the last reload the page triggered for the
// offer it shows ({ windowIndex of the offer when it fired, atMs }), or null.
describe("shouldReloadOffer", () => {
  const NOW = 1_700_000_100_000;

  it("does not reload while time is left", () => {
    expect(
      shouldReloadOffer({ secondsLeft: 1, windowIndex: 7, lastReload: null, nowMs: NOW }),
    ).toBe(false);
  });

  it("reloads when the countdown reaches 0 and nothing was reloaded yet", () => {
    expect(
      shouldReloadOffer({ secondsLeft: 0, windowIndex: 7, lastReload: null, nowMs: NOW }),
    ).toBe(true);
  });

  it("does not retry 1999 ms after a reload that returned the same window", () => {
    const lastReload = { windowIndex: 7, atMs: NOW - 1999 };
    expect(shouldReloadOffer({ secondsLeft: 0, windowIndex: 7, lastReload, nowMs: NOW })).toBe(
      false,
    );
  });

  it("retries 2000 ms after a reload that returned the same window", () => {
    const lastReload = { windowIndex: 7, atMs: NOW - 2000 };
    expect(shouldReloadOffer({ secondsLeft: 0, windowIndex: 7, lastReload, nowMs: NOW })).toBe(
      true,
    );
  });

  it("reloads at the end of a new window even right after the previous reload", () => {
    const lastReload = { windowIndex: 7, atMs: NOW - 100 };
    expect(shouldReloadOffer({ secondsLeft: 0, windowIndex: 8, lastReload, nowMs: NOW })).toBe(
      true,
    );
  });
});

// createOfferReloader(): the page keeps one per mounted countdown. `claimReload({ secondsLeft,
// windowIndex, nowMs })` decides whether to reload the offer now AND records that reload, so the
// caller holds no "last reload" state of its own.
describe("createOfferReloader", () => {
  const NOW = 1_700_000_100_000;
  const atEnd = (windowIndex: number, nowMs: number) => ({ secondsLeft: 0, windowIndex, nowMs });

  it("records each reload it grants", () => {
    const reloader = createOfferReloader();
    expect(reloader.claimReload(atEnd(7, NOW))).toBe(true);
    expect(reloader.claimReload(atEnd(7, NOW + 1999))).toBe(false);
    expect(reloader.claimReload(atEnd(7, NOW + 2000))).toBe(true);
    // The delay runs from the last reload, not from the first.
    expect(reloader.claimReload(atEnd(7, NOW + 3999))).toBe(false);
  });

  it("keeps independent memory per reloader", () => {
    createOfferReloader().claimReload(atEnd(7, NOW));
    expect(createOfferReloader().claimReload(atEnd(7, NOW))).toBe(true);
  });
});
