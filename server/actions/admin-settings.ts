"use server";

import { refresh } from "next/cache";
import { routing } from "@/i18n/routing";
import { runRestoreSetting } from "@/lib/admin/restore-setting";
import { runSaveSetting, type SettingWriteResult } from "@/lib/admin/save-setting";
import { readChange, writeSetting } from "@/server/admin/settings";
import { getStaffSession } from "@/server/auth/require-staff";

/**
 * The staff session, read again by each action: the page's guard does not cover an action, which
 * anyone can POST to. The locale only shapes the redirect getStaffSession drops: none comes from
 * the browser. The use cases check the rôle d’équipe.
 */
const getSession = () => getStaffSession(routing.defaultLocale);

/** Saves one paramètre du jeu from its card on the Paramètres page. */
export async function saveSetting(
  _prev: SettingWriteResult | null,
  formData: FormData,
): Promise<SettingWriteResult> {
  return runSaveSetting(
    { setting: formData.get("setting"), value: formData.get("value") },
    { getSession, writeSetting, refresh },
  );
}

/** Puts back the Avant of a row of the historique des paramètres, after its confirmation dialog. */
export async function restoreSetting(
  _prev: SettingWriteResult | null,
  formData: FormData,
): Promise<SettingWriteResult> {
  return runRestoreSetting(
    { changeId: formData.get("changeId") },
    { getSession, readChange, writeSetting, refresh },
  );
}
