/** Minimum delay between two offer reloads while the server still answers with the same window. */
export const RELOAD_RETRY_MS = 2000;

/**
 * Seconds left, counted from the server's value at render with the browser's elapsed time only,
 * so a wrong browser clock cannot shift the countdown. Rounded up: 0 only once the time is over.
 */
export function remainingSeconds(
  secondsAtRender: number,
  renderedAtMs: number,
  nowMs: number,
): number {
  return Math.max(0, Math.ceil(secondsAtRender - (nowMs - renderedAtMs) / 1000));
}

/** Share of the window still to run, from 1 (just started) down to 0 (over). */
export function remainingShare(secondsLeft: number, windowSeconds: number): number {
  if (windowSeconds <= 0) return 0;
  return Math.min(1, Math.max(0, secondsLeft / windowSeconds));
}

export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

type ReloadInput = {
  secondsLeft: number;
  /** Window of the offer currently shown. */
  windowIndex: number;
  /** Last reload triggered, with the window of the offer shown when it fired. */
  lastReload: { windowIndex: number; atMs: number } | null;
  nowMs: number;
};

/** Whether the page should ask the server for the offer again: at the window end, never in a tight loop. */
export function shouldReloadOffer({
  secondsLeft,
  windowIndex,
  lastReload,
  nowMs,
}: ReloadInput): boolean {
  if (secondsLeft > 0) return false;
  if (!lastReload || lastReload.windowIndex !== windowIndex) return true;
  return nowMs - lastReload.atMs >= RELOAD_RETRY_MS;
}

/** Holds the last reload the page triggered, so callers keep no such state of their own. */
export function createOfferReloader() {
  let lastReload: ReloadInput["lastReload"] = null;
  return {
    /** Decides whether to reload the offer now and, if so, records that reload. */
    claimReload(input: Omit<ReloadInput, "lastReload">): boolean {
      if (!shouldReloadOffer({ ...input, lastReload })) return false;
      lastReload = { windowIndex: input.windowIndex, atMs: input.nowMs };
      return true;
    },
  };
}
