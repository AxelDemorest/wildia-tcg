"use server";

import { revalidatePath } from "next/cache";
import { runOpenShopSlot, type OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import { getUser } from "@/server/auth/require-user";
import { assertOpenBoosterRateLimit } from "@/server/rate-limit/enforce";
import { openBoosterShopSlot, type OpenBoosterResult } from "@/server/boosters/open-pack";
import { getCatalogCardBySlug } from "@/server/cards/queries";

export type OpenShopSlotActionResult =
  | { ok: true; result: OpenBoosterResult; cards: Awaited<ReturnType<typeof enrichCards>> }
  | Extract<OpenShopSlotOutcome<OpenBoosterResult>, { ok: false }>;

async function enrichCards(locale: string, result: OpenBoosterResult) {
  const cards = await Promise.all(
    result.cards.map(async (drawn) => {
      const catalog = await getCatalogCardBySlug(locale, drawn.slug).catch(() => null);
      if (!catalog) {
        return {
          ...drawn,
          name: drawn.slug,
          scientific_name: null,
          iucn_status: null,
          description: "",
          image_path: null,
          stats: { power: 0, defense: 0, speed: 0 },
        };
      }
      return {
        ...drawn,
        name: catalog.name,
        scientific_name: catalog.scientific_name,
        iucn_status: catalog.iucn_status,
        description: catalog.description,
        image_path: catalog.image_path,
        stats: catalog.stats,
      };
    }),
  );
  return cards;
}

/** Opens an emplacement of the player's offre boutique; counted by the open_booster rate limit. */
export async function openShopSlot(formData: FormData): Promise<OpenShopSlotActionResult> {
  const outcome = await runOpenShopSlot(
    {
      locale: formData.get("locale"),
      windowIndex: formData.get("windowIndex"),
      slotIndex: formData.get("slotIndex"),
    },
    {
      getUserId: async () => {
        const user = await getUser();
        return user?.id ?? null;
      },
      checkRateLimit: assertOpenBoosterRateLimit,
      openSlot: openBoosterShopSlot,
      revalidate: (locale, userId) => {
        revalidatePath(`/${locale}/players/${userId}/collection`);
        revalidatePath(`/${locale}/boosters`);
      },
    },
  );

  if (!outcome.ok) return outcome;

  const cards = await enrichCards(outcome.locale, outcome.result);
  return { ok: true, result: outcome.result, cards };
}
