import "server-only";

import {
  BOOSTER_FIELDS,
  boosterFromRow,
  isBoosterField,
  type BoosterRow,
  type BoosterSettings,
  type BoosterValue,
} from "@/lib/admin/booster-values";
import type { ChangeToRestore } from "@/lib/admin/restore-setting";
import { boosterRuleOf, type BoosterWrite } from "@/lib/admin/save-booster";
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

/**
 * Runs one read or write of the Paramètres page, logging its failure here before rethrowing it. A
 * booster rule the database refuses is a normal outcome, shown as a message: rethrown unlogged.
 */
async function logged<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (boosterRuleOf(error) !== null) throw error;
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

/** Every booster définition, active or not, in the boutique's order. */
function readBoosters(): Promise<BoosterSettings[]> {
  return logged("reading the boosters", async () => {
    const { data, error } = await createServiceClient()
      .from("booster_definitions")
      .select("slug, cost_coins, slots, shop_weight, is_active, rarity_weights")
      .order("sort_order")
      .order("id");
    if (error) throw new Error(error.message);
    return (data as BoosterRow[]).map(boosterFromRow);
  });
}

/** A PostgREST `in` list, each value quoted: a booster field holds a dot. */
const inList = (values: readonly string[]) => `(${values.map((value) => `"${value}"`).join(",")})`;

/** The history rows of the values this page edits: its economy_config keys, the booster fields. */
const EDITED_VALUES_FILTER = [
  `and(scope.eq.economy_config,target.in.${inList(EDITABLE_SETTINGS)})`,
  `and(scope.eq.booster_definition,field.in.${inList(BOOSTER_FIELDS)})`,
].join(",");

/** The latest changes of the values this page edits, newest first. */
function readHistory(limit: number): Promise<SettingChangeRecord[]> {
  return logged("reading the history", async () => {
    const { data, error } = await createServiceClient()
      .from("admin_setting_changes")
      .select(
        "id, scope, target, field, old_value, new_value, author_id, changed_at, restored_from",
      )
      .or(EDITED_VALUES_FILTER)
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
  return runLoadSettings(session, { readValues, readBoosters, readHistory, readAuthorNames });
}

/**
 * A row of the history, for runRestoreSetting once the session is checked: its setting or booster
 * value (setting null when this page does not edit it) and its old value, read here rather than
 * sent by the browser.
 */
export function readChange(id: number): Promise<ChangeToRestore | null> {
  return logged(`reading the change ${id}`, async () => {
    const { data, error } = await createServiceClient()
      .from("admin_setting_changes")
      .select("scope, target, field, old_value")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const { scope, target, field, old_value } = data as {
      scope: string;
      target: string;
      field: string | null;
      /** A number written from a numeric column, or a boolean for whether a booster is active. */
      old_value: BoosterValue;
    };
    if (scope === "booster_definition" && isBoosterField(field)) {
      return { id, booster: { slug: target, field }, before: old_value };
    }
    if (scope === "economy_config" && isEditableSetting(target) && typeof old_value === "number") {
      return { id, setting: target, before: old_value };
    }
    return { id, setting: null };
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

/**
 * Changes values of a booster définition and adds a history row per changed value in one
 * transaction (admin_set_booster_definition, executable by the service role only). Called by
 * runSaveBooster and runRestoreSetting once the session is checked. A change the function refuses
 * by one of its rules throws an Error whose message is the rule (the exception's message).
 */
export function writeBooster({
  slug,
  changes,
  authorId,
  restoredFrom,
}: BoosterWrite): Promise<void> {
  return logged(`writing the booster ${slug}`, async () => {
    const { error } = await createServiceClient().rpc("admin_set_booster_definition", {
      p_slug: slug,
      p_changes: changes,
      p_author_id: authorId,
      p_restored_from: restoredFrom,
    });
    if (error) throw new Error(error.message);
  });
}
