import {
  isEditableSetting,
  parseSettingValue,
  SETTINGS_ROLE,
  type EditableSetting,
  type SettingValueError,
} from "@/lib/admin/setting-values";
import type { StaffSession } from "@/lib/auth/staff-session";

/** One change of a paramètre du jeu, written with its history row. */
export type SettingWrite = {
  setting: EditableSetting;
  value: number;
  authorId: string;
  /** On a restore, the history row whose old value is put back; else null. */
  restoredFrom: number | null;
};

export type SaveSettingDeps = {
  /** The staff session read again by the action itself: an action is reachable by a plain POST. */
  getSession: () => Promise<StaffSession | null>;
  /** Throws when the write fails, after logging it: nothing is changed then. */
  writeSetting: (write: SettingWrite) => Promise<void>;
  /** Renders the page again in the action's response: the card and the history show the change. */
  refresh: () => void;
};

export type SettingWriteError = "forbidden" | "invalid" | SettingValueError | "failed";

export type SettingWriteResult = { ok: true } | { ok: false; error: SettingWriteError };

/**
 * Writes one change, then renders the page again; a failed write changes nothing, so the page is
 * not rendered again and the result says so: the refusal `refusalOf` finds in the error, if any,
 * else `failed`.
 */
export async function writeThenRefresh<Refusal extends string = never>(
  write: () => Promise<void>,
  refresh: () => void,
  refusalOf: (error: unknown) => Refusal | null = () => null,
): Promise<{ ok: true } | { ok: false; error: Refusal | "failed" }> {
  try {
    await write();
  } catch (error) {
    return { ok: false, error: refusalOf(error) ?? "failed" };
  }
  refresh();
  return { ok: true };
}

/**
 * Saves one paramètre du jeu from the Paramètres page, for a super administrateur only;
 * dependencies are injected so it runs without Next nor Supabase. The browser sends the setting
 * and its new value only: the author comes from the session, the old value is read by the database.
 */
export async function runSaveSetting(
  { setting, value }: { setting: unknown; value: unknown },
  deps: SaveSettingDeps,
): Promise<SettingWriteResult> {
  const session = await deps.getSession();
  if (session?.role !== SETTINGS_ROLE) return { ok: false, error: "forbidden" };

  if (!isEditableSetting(setting)) return { ok: false, error: "invalid" };
  const parsed = parseSettingValue(setting, value);
  if (!parsed.ok) return parsed;

  return writeThenRefresh(
    () =>
      deps.writeSetting({ setting, value: parsed.value, authorId: session.id, restoredFrom: null }),
    deps.refresh,
  );
}
