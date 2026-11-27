import {
  boosterChange,
  parseBoosterValue,
  type BoosterField,
  type BoosterValue,
} from "@/lib/admin/booster-values";
import { boosterRuleOf, type BoosterRule, type SaveBoosterDeps } from "@/lib/admin/save-booster";
import {
  writeThenRefresh,
  type SaveSettingDeps,
  type SettingWriteResult,
} from "@/lib/admin/save-setting";
import { parseSettingValue, SETTINGS_ROLE, type EditableSetting } from "@/lib/admin/setting-values";

/**
 * A row of the historique des paramètres, read by the server to restore its Avant (`before`): of
 * a setting or of a booster's value. A row of a setting the Paramètres page does not edit has no
 * setting and nothing to restore.
 */
export type ChangeToRestore =
  | { id: number; setting: EditableSetting; before: number }
  | { id: number; booster: { slug: string; field: BoosterField }; before: BoosterValue }
  | { id: number; setting: null };

export type RestoreSettingDeps = SaveSettingDeps &
  Pick<SaveBoosterDeps, "writeBooster"> & {
    /** The row, or null when there is none; throws when the read fails, after logging it. */
    readChange: (id: number) => Promise<ChangeToRestore | null>;
  };

/** A restore's result: a booster row may also be refused by a rule the database checks. */
export type RestoreResult = SettingWriteResult | { ok: false; error: BoosterRule };

export type RestoreError = Extract<RestoreResult, { ok: false }>["error"];

/** A history row's id as a form sends it: digits only. */
function parseChangeId(raw: unknown): number | null {
  return typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : null;
}

/**
 * Puts back the Avant of a row of the historique des paramètres, for a super administrateur only,
 * and records it as a new row pointing at that one. The browser sends the row's id only: the
 * setting and its value are read here, on the server.
 */
export async function runRestoreSetting(
  { changeId }: { changeId: unknown },
  deps: RestoreSettingDeps,
): Promise<RestoreResult> {
  const session = await deps.getSession();
  if (session?.role !== SETTINGS_ROLE) return { ok: false, error: "forbidden" };

  const id = parseChangeId(changeId);
  if (id === null) return { ok: false, error: "invalid" };

  // A row that cannot be read, no longer exists or belongs to another page: nothing to restore.
  const change = await deps.readChange(id).catch(() => null);
  if (change && "booster" in change) return restoreBooster(change, session.id, deps);
  if (!change?.setting) return { ok: false, error: "failed" };

  // Checked like a typed value: a value set out of bounds in SQL is not put back.
  const parsed = parseSettingValue(change.setting, String(change.before));
  if (!parsed.ok) return parsed;

  return writeThenRefresh(
    () =>
      deps.writeSetting({
        setting: change.setting,
        value: parsed.value,
        authorId: session.id,
        restoredFrom: change.id,
      }),
    deps.refresh,
  );
}

/** Puts back the Avant of a booster's row: that value only, the booster's others stay as they are. */
async function restoreBooster(
  { id, booster, before }: Extract<ChangeToRestore, { booster: unknown }>,
  authorId: string,
  deps: RestoreSettingDeps,
): Promise<RestoreResult> {
  const { slug, field } = booster;
  const changes = boosterChange(field, before);
  if (!changes) return { ok: false, error: "failed" };

  // Checked like a typed value: a value set out of bounds in SQL is not put back.
  if (field !== "is_active") {
    const parsed = parseBoosterValue(field, String(before));
    if (!parsed.ok) return parsed;
  }

  return writeThenRefresh(
    () => deps.writeBooster({ slug, changes, authorId, restoredFrom: id }),
    deps.refresh,
    boosterRuleOf,
  );
}
