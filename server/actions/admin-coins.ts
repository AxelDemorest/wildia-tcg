"use server";

import { refresh } from "next/cache";
import { routing } from "@/i18n/routing";
import { runGrantCoins, type GrantCoinsResult } from "@/lib/admin/grant-coins";
import { writeCoinGrant } from "@/server/admin/coins";
import { getStaffSession } from "@/server/auth/require-staff";

/**
 * The staff session, read again by the action: the page's guard does not cover an action, which
 * anyone can POST to. The locale only shapes the redirect getStaffSession drops: none comes from
 * the browser. runGrantCoins checks the rôle d’équipe.
 */
const getSession = () => getStaffSession(routing.defaultLocale);

/**
 * Adds coins to an account from its row of the registre des comptes inscrits, after its dialog. A
 * grant renders the page again in the action's response, so the row shows the new balance.
 */
export async function grantCoins(
  _prev: GrantCoinsResult | null,
  formData: FormData,
): Promise<GrantCoinsResult> {
  return runGrantCoins(
    {
      userId: formData.get("userId"),
      amount: formData.get("amount"),
      reason: formData.get("reason"),
    },
    { getSession, writeGrant: writeCoinGrant, refresh },
  );
}
