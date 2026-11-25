import type { BoosterField, BoosterSettings } from "@/lib/admin/booster-values";
import { isEditableSetting, SETTINGS_ROLE, type EditableSetting } from "@/lib/admin/setting-values";
import type { StaffSession } from "@/lib/auth/staff-session";

/** How many changes the historique des paramètres shows, newest first, without pagination. */
export const SETTINGS_HISTORY_LIMIT = 20;

/**
 * A row of admin_setting_changes as the table holds it (snake_case, ISO date), for a value the
 * Paramètres page edits: the history is read for those values only.
 */
export type SettingChangeRecord = {
  id: number;
  scope: "economy_config" | "booster_definition";
  /** The economy_config key, or the booster's slug. */
  target: string;
  /** Null for an economy_config value; the value of a booster définition otherwise. */
  field: BoosterField | null;
  /** JSON scalars: a number, or a boolean for whether a booster is active. */
  old_value: number | boolean;
  new_value: number | boolean;
  /** Null once the author's account is deleted. */
  author_id: string | null;
  changed_at: string;
  restored_from: number | null;
};

export type LoadSettingsDeps = {
  readValues: () => Promise<Record<EditableSetting, number>>;
  /** Every booster définition, active or not, in sort_order. */
  readBoosters: () => Promise<BoosterSettings[]>;
  /** The `limit` latest changes, newest first. */
  readHistory: (limit: number) => Promise<SettingChangeRecord[]>;
  /** The display name of each account, null for an account without one. */
  readAuthorNames: (ids: string[]) => Promise<Map<string, string | null>>;
};

export type SettingChangeAuthor = { kind: "member"; name: string | null } | { kind: "deleted" };

/** What a change of the history is about: a setting, or one value of a booster définition. */
type SettingChangeSubject =
  { setting: EditableSetting } | { booster: { slug: string; field: BoosterField } };

/** A change of the history, as the page shows it. */
export type SettingChange = SettingChangeSubject & {
  id: number;
  before: number | boolean;
  after: number | boolean;
  author: SettingChangeAuthor;
  /** ISO date, written for the locale by the page. */
  changedAt: string;
  /** True for a change that put back the old value of another row. */
  isRestore: boolean;
};

/**
 * The Paramètres page's data; a failed read (logged by the server) or a rôle d’équipe other than
 * super administrateur gets none of it.
 */
export type SettingsPage =
  | {
      kind: "loaded";
      values: Record<EditableSetting, number>;
      boosters: BoosterSettings[];
      history: SettingChange[];
    }
  | { kind: "failed" }
  | { kind: "forbidden" };

function authorOf(authorId: string | null, names: Map<string, string | null>): SettingChangeAuthor {
  if (authorId === null) return { kind: "deleted" };
  return { kind: "member", name: names.get(authorId) ?? null };
}

/** A booster's row names its field; an economy_config row has none. Null for another key. */
function subjectOf({ target, field }: SettingChangeRecord): SettingChangeSubject | null {
  if (field !== null) return { booster: { slug: target, field } };
  return isEditableSetting(target) ? { setting: target } : null;
}

/**
 * The Paramètres page's data for a super administrateur: the current values, the booster
 * définitions and the latest changes with their authors' names. Another rôle d’équipe reads
 * nothing. Dependencies are injected so it runs without Next nor Supabase.
 */
export async function runLoadSettings(
  session: StaffSession,
  deps: LoadSettingsDeps,
): Promise<SettingsPage> {
  if (session.role !== SETTINGS_ROLE) return { kind: "forbidden" };

  try {
    const [values, boosters, records] = await Promise.all([
      deps.readValues(),
      deps.readBoosters(),
      deps.readHistory(SETTINGS_HISTORY_LIMIT),
    ]);
    const authorIds = [...new Set(records.flatMap((record) => record.author_id ?? []))];
    const names =
      authorIds.length > 0
        ? await deps.readAuthorNames(authorIds)
        : new Map<string, string | null>();

    return {
      kind: "loaded",
      values,
      boosters,
      history: records.flatMap((record) => {
        const subject = subjectOf(record);
        if (!subject) return [];
        return {
          ...subject,
          id: record.id,
          before: record.old_value,
          after: record.new_value,
          author: authorOf(record.author_id, names),
          changedAt: record.changed_at,
          isRestore: record.restored_from !== null,
        };
      }),
    };
  } catch {
    return { kind: "failed" };
  }
}
