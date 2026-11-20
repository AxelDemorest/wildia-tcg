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
