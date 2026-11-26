"use server";

import { refresh } from "next/cache";
import { routing } from "@/i18n/routing";
import { byRarity } from "@/lib/admin/booster-values";
import { runRestoreSetting, type RestoreResult } from "@/lib/admin/restore-setting";
import { runSaveBooster, type BoosterSaveResult } from "@/lib/admin/save-booster";
import { runSaveSetting, type SettingWriteResult } from "@/lib/admin/save-setting";
import { readChange, writeBooster, writeSetting } from "@/server/admin/settings";
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

/** Saves a booster définition from its card on the Paramètres page; `isActive` is sent when on. */
export async function saveBooster(
  _prev: BoosterSaveResult | null,
  formData: FormData,
): Promise<BoosterSaveResult> {
  return runSaveBooster(
    {
      slug: formData.get("slug"),
      costCoins: formData.get("costCoins"),
      slots: formData.get("slots"),
      shopWeight: formData.get("shopWeight"),
      isActive: formData.has("isActive"),
      rarityWeights: byRarity((rarity) => formData.get(`rarityWeights.${rarity}`)),
    },
    { getSession, writeBooster, refresh },
  );
}

/** Puts back the Avant of a row of the historique des paramètres, after its confirmation dialog. */
export async function restoreSetting(
  _prev: RestoreResult | null,
  formData: FormData,
): Promise<RestoreResult> {
  return runRestoreSetting(
    { changeId: formData.get("changeId") },
    { getSession, readChange, writeSetting, writeBooster, refresh },
  );
}
