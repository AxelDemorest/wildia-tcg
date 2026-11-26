import { z } from "zod";
import { writeThenRefresh } from "@/lib/admin/save-setting";
import { wholeNumberIn, type Bounds } from "@/lib/admin/whole-number";
import type { StaffSession, TeamRole } from "@/lib/auth/staff-session";

/**
 * The only rôle d’équipe that adds coins to an account: the registry shows the button to it alone,
 * and the action refuses every other one.
 */
export const GRANT_COINS_ROLE: TeamRole = "super_admin";

/**
 * The bounds of a grant, in whole coins. No business maximum: the most the ledger's amount column,
 * numeric(14, 4), holds.
 */
export const GRANT_AMOUNT: Bounds = { min: 1, max: 9_999_999_999 };

/**
 * Where the notification text of a grant keeps the amount: the server writes the text of each row
 * with this placeholder, and the browser, which knows the amount, puts it in.
 */
export const GRANTED_AMOUNT_PLACEHOLDER = "{amount}";

/**
 * The most characters a grant's reason holds, once the spaces around it are trimmed. Characters
 * are code points: an emoji counts as one.
 */
const GRANT_REASON_MAX_LENGTH = 200;

/** Account ids are uuids: anything else is refused before the database is reached. */
const accountIdSchema = z.guid();

/** One grant of coins to an account, written with its ledger row. */
export type CoinGrant = {
  userId: string;
  amount: number;
  /** Null when no reason was given. */
  reason: string | null;
  authorId: string;
};

export type GrantCoinsDeps = {
  /** The staff session read again by the action itself: an action is reachable by a plain POST. */
  getSession: () => Promise<StaffSession | null>;
  /**
   * Throws when the write fails, after logging it: nothing is written then. An account that no
   * longer exists throws an Error whose message is `unknown_account`.
   */
  writeGrant: (grant: CoinGrant) => Promise<void>;
  /** Renders the page again in the action's response: the row shows the new balance. */
  refresh: () => void;
};

/** Why a grant's values are refused, by form field: only the fields refused. */
export type GrantCoinsErrors = { amount?: "out_of_range"; reason?: "too_long" };

/** `invalid_values`: the refused values, by form field, each shown under its field. */
export type GrantCoinsResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "invalid" | "unknown_account" | "failed" }
  | { ok: false; error: "invalid_values"; fields: GrantCoinsErrors };

/** `unknown_account` when a grant was refused for it, read in its error; null for any other failure. */
export function unknownAccountOf(error: unknown): "unknown_account" | null {
  return error instanceof Error && error.message === "unknown_account" ? "unknown_account" : null;
}

/** The reason as the dialog sends it, trimmed; null when there is none. */
function reasonOf(raw: unknown): string | null {
  const reason = typeof raw === "string" ? raw.trim() : "";
  return reason === "" ? null : reason;
}

/**
 * Adds coins to an account from its row of the registre des comptes inscrits, for a super
 * administrateur only; dependencies are injected so it runs without Next nor Supabase. The browser
 * sends the account, the amount and the optional reason: the author comes from the session.
 */
export async function runGrantCoins(
  form: { userId: unknown; amount: unknown; reason?: unknown },
  deps: GrantCoinsDeps,
): Promise<GrantCoinsResult> {
  const session = await deps.getSession();
  if (session?.role !== GRANT_COINS_ROLE) return { ok: false, error: "forbidden" };

  const userId = accountIdSchema.safeParse(form.userId);
  if (!userId.success) return { ok: false, error: "invalid" };
  const amount = wholeNumberIn(form.amount, GRANT_AMOUNT);
  const reason = reasonOf(form.reason);

  const fields: GrantCoinsErrors = {};
  if (amount === null) fields.amount = "out_of_range";
  if (reason !== null && Array.from(reason).length > GRANT_REASON_MAX_LENGTH) {
    fields.reason = "too_long";
  }
  if (amount === null || fields.reason) return { ok: false, error: "invalid_values", fields };

  return writeThenRefresh(
    () => deps.writeGrant({ userId: userId.data, amount, reason, authorId: session.id }),
    deps.refresh,
    unknownAccountOf,
  );
}
