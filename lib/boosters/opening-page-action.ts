import type { LoadDrawOutcome } from "@/lib/boosters/load-draw";
import type { ShopNotice } from "@/lib/boosters/shop-notice";

/** Where the révélation page sends the player instead of showing the draw. */
type LeaveAction = { kind: "not-found" } | { kind: "login" } | { kind: "shop"; notice: ShopNotice };

type LoadDrawFailure = Extract<LoadDrawOutcome, { ok: false }>;

// A new loader error fails typecheck here until the page knows what to do with it.
const leaveOnError: Record<LoadDrawFailure["error"], LeaveAction> = {
  // An unknown or foreign draw is a 404, never an ouverture "already done".
  not_found: { kind: "not-found" },
  unauthenticated: { kind: "login" },
  // The cards are in the collection already: the shop says so.
  failed: { kind: "shop", notice: "load-failed" },
};

/**
 * Where the révélation page goes when the loader fails, decided on the server before the shop's
 * marker is read.
 */
export function openingPageAction(outcome: LoadDrawFailure): LeaveAction {
  return leaveOnError[outcome.error];
}
