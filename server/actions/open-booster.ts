"use server";

import { revalidatePath } from "next/cache";
import { enrichDrawnCards, type RevealedCard } from "@/lib/boosters/enrich-drawn-cards";
import { runOpenShopSlot, type OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import { getUser } from "@/server/auth/require-user";
import { assertOpenBoosterRateLimit } from "@/server/rate-limit/enforce";
import { openBoosterShopSlot, type OpenBoosterResult } from "@/server/boosters/open-pack";
import { getCatalogCardBySlug } from "@/server/cards/queries";

export type OpenShopSlotActionResult =
  | { ok: true; result: OpenBoosterResult; cards: RevealedCard[] }
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
        revalidatePath(`/${locale}/collection`);
        revalidatePath(`/${locale}/boosters`);
      },
    },
  );

  if (!outcome.ok) return outcome;

  const cards = await enrichDrawnCards(outcome.result.cards, outcome.locale, getCatalogCardBySlug);
  return { ok: true, result: outcome.result, cards };
}
