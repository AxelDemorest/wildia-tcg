import { describe, expect, it } from "vitest";
import type { OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import { refusalReloadsOffer } from "@/lib/boosters/open-shop-slot";

type RefusalCode = Extract<OpenShopSlotOutcome<unknown>, { ok: false }>["error"];

// A code added to the action's outcome fails typecheck here until the developer decides
// whether its refusal reloads the offer.
const reloadsOffer: Record<RefusalCode, boolean> = {
  slot_exhausted: true,
  window_closed: true,
  slot_not_found: false,
  booster_unavailable: false,
  insufficient_balance: false,
  rate_limited: false,
  invalid: false,
  unauthenticated: false,
  failed: false,
};

describe("refusalReloadsOffer(code)", () => {
  it.each(Object.entries(reloadsOffer) as [RefusalCode, boolean][])(
    "%s → reloads the offer: %s",
    (code, expected) => {
      expect(refusalReloadsOffer(code)).toBe(expected);
    },
  );
});
