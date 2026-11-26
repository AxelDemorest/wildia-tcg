import {
  parseBoosterCard,
  type BoosterCard,
  type BoosterCardErrors,
  type BoosterChanges,
} from "@/lib/admin/booster-values";
import { writeThenRefresh } from "@/lib/admin/save-setting";
import { SETTINGS_ROLE } from "@/lib/admin/setting-values";
import type { StaffSession } from "@/lib/auth/staff-session";

/** One change of a booster définition, written with a history row per changed value. */
export type BoosterWrite = {
  slug: string;
  changes: BoosterChanges;
  authorId: string;
  /** On a restore, the history row whose old value is put back; else null. */
  restoredFrom: number | null;
};

/** A booster card as the browser sends it: every value of the définition, as the form holds it. */
export type BoosterForm = { slug: unknown } & BoosterCard<unknown>;

const BOOSTER_RULES = ["no_available_booster", "no_positive_chance"] as const;

/**
 * A rule the database checks on every booster change: at least one booster the boutique can
 * offer (active, with a positive shop weight), and at least one positive chance per booster.
 */
export type BoosterRule = (typeof BOOSTER_RULES)[number];

/** The rule a booster write was refused by, read in its error; null for any other failure. */
export function boosterRuleOf(error: unknown): BoosterRule | null {
  if (!(error instanceof Error)) return null;
  return BOOSTER_RULES.find((rule) => rule === error.message) ?? null;
}

export type SaveBoosterDeps = {
  /** The staff session read again by the action itself: an action is reachable by a plain POST. */
  getSession: () => Promise<StaffSession | null>;
  /**
   * Throws when the write fails, after logging it: nothing is changed then. A change the database
   * refuses by one of its rules throws an Error whose message is the rule.
   */
  writeBooster: (write: BoosterWrite) => Promise<void>;
  /** Renders the page again in the action's response: the card and the history show the change. */
  refresh: () => void;
};

/** `invalid_values`: the refused values, by form field, each shown under its field. */
export type BoosterSaveResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "invalid" | BoosterRule | "failed" }
  | { ok: false; error: "invalid_values"; fields: BoosterCardErrors };

/**
 * Saves a booster card from the Paramètres page, for a super administrateur only; dependencies
 * are injected so it runs without Next nor Supabase. Every value of the card is sent: the database
 * writes the changed ones only, reads the old values itself and checks its rules. The author
 * comes from the session.
 */
export async function runSaveBooster(
  form: BoosterForm,
  deps: SaveBoosterDeps,
): Promise<BoosterSaveResult> {
  const session = await deps.getSession();
  if (session?.role !== SETTINGS_ROLE) return { ok: false, error: "forbidden" };

  const { slug, ...card } = form;
  if (typeof slug !== "string") return { ok: false, error: "invalid" };
  const parsed = parseBoosterCard(card);
  if (!parsed.ok) return { ok: false, error: "invalid_values", fields: parsed.fields };

  const { costCoins, slots, shopWeight, isActive, rarityWeights } = parsed.values;
  const changes: BoosterChanges = {
    cost_coins: costCoins,
    slots,
    shop_weight: shopWeight,
    is_active: isActive,
    rarity_weights: rarityWeights,
  };
  return writeThenRefresh(
    () => deps.writeBooster({ slug, changes, authorId: session.id, restoredFrom: null }),
    deps.refresh,
    boosterRuleOf,
  );
}
