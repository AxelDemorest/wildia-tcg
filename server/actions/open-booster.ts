"use server";

import { revalidatePath } from "next/cache";
import {
  pathsRevalidatedAfterOpening,
  runOpenShopSlot,
  type OpenShopSlotOutcome,
} from "@/lib/boosters/open-shop-slot";
import { getUser } from "@/server/auth/require-user";
import { assertOpenBoosterRateLimit } from "@/server/rate-limit/enforce";
import { openBoosterShopSlot, type OpenBoosterResult } from "@/server/boosters/open-pack";

export type OpenShopSlotActionResult =
  | { ok: true; result: OpenBoosterResult }
  | Extract<OpenShopSlotOutcome<OpenBoosterResult>, { ok: false }>;

/** Opens an emplacement of the player's offre boutique; counted by the open_booster rate limit. */
export async function openShopSlot(formData: FormData): Promise<OpenShopSlotActionResult> {
  const outcome = await runOpenShopSlot(
    {
      locale: formData.get("locale"),
      windowIndex: formData.get("windowIndex"),
      slotIndex: formData.get("slotIndex"),
    },
    {
      getUserId: async () => (await getUser())?.id ?? null,
      checkRateLimit: assertOpenBoosterRateLimit,
      openSlot: openBoosterShopSlot,
      revalidate: (locale) => {
        pathsRevalidatedAfterOpening(locale).forEach((path) => revalidatePath(path));
      },
    },
  );

  if (!outcome.ok) return outcome;

  return { ok: true, result: outcome.result };
}
