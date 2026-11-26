import { SETTINGS_ROLE, type EditableSetting } from "@/lib/admin/setting-values";
import type { StaffSession } from "@/lib/auth/staff-session";

/** How many changes the historique des paramètres shows, newest first, without pagination. */
export const SETTINGS_HISTORY_LIMIT = 20;

/**
 * A row of admin_setting_changes as the table holds it (snake_case, ISO date), for a setting the
 * Paramètres page edits: the history is read for those settings only.
 */
export type SettingChangeRecord = {
  id: number;
  scope: string;
  target: EditableSetting;
  field: string | null;
  /** JSON scalars; an economy_config value is a number. */
  old_value: number;
  new_value: number;
  /** Null once the author's account is deleted. */
  author_id: string | null;
  changed_at: string;
  restored_from: number | null;
};

export type LoadSettingsDeps = {
  readValues: () => Promise<Record<EditableSetting, number>>;
  /** The `limit` latest changes, newest first. */
  readHistory: (limit: number) => Promise<SettingChangeRecord[]>;
  /** The display name of each account, null for an account without one. */
  readAuthorNames: (ids: string[]) => Promise<Map<string, string | null>>;
};

export type SettingChangeAuthor = { kind: "member"; name: string | null } | { kind: "deleted" };

/** A change of the history, as the page shows it. */
export type SettingChange = {
  id: number;
  setting: EditableSetting;
  before: number;
  after: number;
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
  | { kind: "loaded"; values: Record<EditableSetting, number>; history: SettingChange[] }
  | { kind: "failed" }
  | { kind: "forbidden" };

function authorOf(authorId: string | null, names: Map<string, string | null>): SettingChangeAuthor {
  if (authorId === null) return { kind: "deleted" };
  return { kind: "member", name: names.get(authorId) ?? null };
}

/**
 * The Paramètres page's data for a super administrateur: the current values and the latest
 * changes with their authors' names. Another rôle d’équipe reads nothing. Dependencies are
 * injected so it runs without Next nor Supabase.
 */
export async function runLoadSettings(
  session: StaffSession,
  deps: LoadSettingsDeps,
): Promise<SettingsPage> {
  if (session.role !== SETTINGS_ROLE) return { kind: "forbidden" };

  try {
    const [values, records] = await Promise.all([
      deps.readValues(),
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
      history: records.map((record) => ({
        id: record.id,
        setting: record.target,
        before: record.old_value,
        after: record.new_value,
        author: authorOf(record.author_id, names),
        changedAt: record.changed_at,
        isRestore: record.restored_from !== null,
      })),
    };
  } catch {
    return { kind: "failed" };
  }
}
