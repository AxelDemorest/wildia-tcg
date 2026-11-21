import { z } from "zod";

const index = z.string().regex(/^\d+$/).transform(Number).refine(Number.isSafeInteger);

/** What the client sends to open an emplacement: the booster itself comes from the stored offre. */
export const openShopSlotInputSchema = z.object({
  locale: z.string(),
  windowIndex: index,
  slotIndex: index,
});

export type OpenShopSlotErrorCode =
  | "insufficient_balance"
  | "slot_not_found"
  | "slot_exhausted"
  | "window_closed"
  | "booster_unavailable"
  | "failed";

const RPC_ERROR_CODES: readonly OpenShopSlotErrorCode[] = [
  "insufficient_balance",
  "slot_not_found",
  "slot_exhausted",
  "window_closed",
  "booster_unavailable",
];

/** Maps an RPC error message to a stable code, by exact equality; anything else is "failed". */
export function openShopSlotErrorCode(message: string): OpenShopSlotErrorCode {
  return RPC_ERROR_CODES.find((code) => code === message) ?? "failed";
}

export type OpenShopSlotDeps<T> = {
  getUserId: () => Promise<string | null>;
  /** true when the player is still under the limit. */
  checkRateLimit: (userId: string) => Promise<boolean>;
  /** Throws an Error carrying the RPC message when the opening is refused. */
  openSlot: (windowIndex: number, slotIndex: number) => Promise<T>;
  revalidate: (locale: string) => void | Promise<void>;
};

export type OpenShopSlotOutcome<T> =
  | { ok: true; result: T; locale: string }
  | { ok: false; error: "invalid" | "unauthenticated" | "rate_limited" | OpenShopSlotErrorCode };

type RefusalCode = Extract<OpenShopSlotOutcome<unknown>, { ok: false }>["error"];

// A record, so a new code fails typecheck until it is decided whether its refusal reloads the offer.
const REFUSAL_RELOADS_OFFER: Record<RefusalCode, boolean> = {
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

/** Whether the offer shown is stale after this refusal: the grid must be reloaded from the server. */
export function refusalReloadsOffer(code: RefusalCode): boolean {
  return REFUSAL_RELOADS_OFFER[code];
}

/** The pages whose cached render shows the pack count or the shop offer, stale after an opening. */
export function pathsRevalidatedAfterOpening(locale: string): string[] {
  return [`/${locale}/collection`, `/${locale}/boosters`];
}

/** Orchestrates the opening of an emplacement; dependencies are injected so it runs without Next nor Supabase. */
export async function runOpenShopSlot<T>(
  input: unknown,
  deps: OpenShopSlotDeps<T>,
): Promise<OpenShopSlotOutcome<T>> {
  const parsed = openShopSlotInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const userId = await deps.getUserId();
  if (!userId) return { ok: false, error: "unauthenticated" };

  if (!(await deps.checkRateLimit(userId))) return { ok: false, error: "rate_limited" };

  const { locale, windowIndex, slotIndex } = parsed.data;
  let result: T;
  try {
    result = await deps.openSlot(windowIndex, slotIndex);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? openShopSlotErrorCode(e.message) : "failed",
    };
  }

  await deps.revalidate(locale);
  return { ok: true, result, locale };
}
