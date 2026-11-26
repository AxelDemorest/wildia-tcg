import "server-only";

import type { ChangeToRestore } from "@/lib/admin/restore-setting";
import type { SettingWrite } from "@/lib/admin/save-setting";
import {
  EDITABLE_SETTINGS,
  isEditableSetting,
  type EditableSetting,
} from "@/lib/admin/setting-values";
import {
  runLoadSettings,
  type SettingChangeRecord,
  type SettingsPage,
} from "@/lib/admin/settings-page";
import type { StaffSession } from "@/lib/auth/staff-session";
import { createServiceClient } from "@/lib/supabase/admin";

/** Runs one read or write of the Paramètres page, logging its failure here before rethrowing it. */
async function logged<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`Admin settings: ${what} failed.`, error);
    throw error;
  }
}

function readValues(): Promise<Record<EditableSetting, number>> {
  return logged("reading the values", async () => {
    const { data, error } = await createServiceClient()
      .from("economy_config")
      .select("key, value")
      .in("key", EDITABLE_SETTINGS);
    if (error) throw new Error(error.message);

    const rows = data as { key: string; value: number }[];
    const valueOf = (setting: EditableSetting) => {
      const row = rows.find((candidate) => candidate.key === setting);
      if (!row) throw new Error(`economy_config has no ${setting}.`);
      return row.value;
    };
    return {
      farm_global_multiplier: valueOf("farm_global_multiplier"),
      booster_shop_slot_count: valueOf("booster_shop_slot_count"),
    };
  });
}

/** The latest changes of the settings this page edits, newest first. */
function readHistory(limit: number): Promise<SettingChangeRecord[]> {
  return logged("reading the history", async () => {
    const { data, error } = await createServiceClient()
      .from("admin_setting_changes")
      .select(
        "id, scope, target, field, old_value, new_value, author_id, changed_at, restored_from",
      )
      .eq("scope", "economy_config")
      .in("target", EDITABLE_SETTINGS)
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data as SettingChangeRecord[];
  });
}

function readAuthorNames(ids: string[]): Promise<Map<string, string | null>> {
  return logged("reading the authors' names", async () => {
    const { data, error } = await createServiceClient()
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    if (error) throw new Error(error.message);

    const profiles = data as { id: string; display_name: string | null }[];
    return new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  });
}

/**
 * The Paramètres page's values and history, read fresh with the service role (the history is
 * closed to the browser). The page calls requireStaff first and passes the session it got.
 */
export function loadSettings(session: StaffSession): Promise<SettingsPage> {
  return runLoadSettings(session, { readValues, readHistory, readAuthorNames });
}

/**
 * A row of the history, for runRestoreSetting once the session is checked: its setting (null when
 * this page does not edit it) and its old value, read here rather than sent by the browser.
 */
export function readChange(id: number): Promise<ChangeToRestore | null> {
  return logged(`reading the change ${id}`, async () => {
    const { data, error } = await createServiceClient()
      .from("admin_setting_changes")
      .select("scope, target, old_value")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { scope, target, old_value } = data as {
      scope: string;
      target: string;
      /** A number in an economy_config row: admin_set_economy_config writes it from numeric. */
      old_value: number;
    };
    if (scope !== "economy_config" || !isEditableSetting(target)) return { id, setting: null };
    return { id, setting: target, before: old_value };
  });
}

/**
 * Changes one setting and adds its history row in one transaction (admin_set_economy_config,
 * executable by the service role only). Called by runSaveSetting and runRestoreSetting once the
 * session is checked.
 */
export function writeSetting({
  setting,
  value,
  authorId,
  restoredFrom,
}: SettingWrite): Promise<void> {
  return logged(`writing ${setting}`, async () => {
    const { error } = await createServiceClient().rpc("admin_set_economy_config", {
      p_key: setting,
      p_value: value,
      p_author_id: authorId,
      p_restored_from: restoredFrom,
    });
    if (error) throw new Error(error.message);
  });
}
