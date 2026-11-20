"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runOpenShopSlot, type OpenShopSlotOutcome } from "@/lib/boosters/open-shop-slot";
import { getUser } from "@/server/auth/require-user";
import { assertOpenBoosterRateLimit } from "@/server/rate-limit/enforce";
import {
  openBoosterPack,
  openBoosterShopSlot,
  type OpenBoosterResult,
} from "@/server/boosters/open-pack";
import { getCatalogCardBySlug } from "@/server/cards/queries";

const schema = z.object({
  locale: z.string(),
  boosterId: z.string().uuid(),
});

export type OpenBoosterActionResult =
  | { ok: true; result: OpenBoosterResult; cards: Awaited<ReturnType<typeof enrichCards>> }
  | {
      ok: false;
      error: "unauthenticated" | "invalid" | "insufficient_balance" | "failed" | "rate_limited";
    };

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

export async function openBooster(formData: FormData): Promise<OpenBoosterActionResult> {
  const parsed = schema.safeParse({
    locale: formData.get("locale"),
    boosterId: formData.get("boosterId"),
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const { locale, boosterId } = parsed.data;
  const user = await getUser();
  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  if (!(await assertOpenBoosterRateLimit(user.id))) {
    return { ok: false, error: "rate_limited" };
  }

  try {
    const result = await openBoosterPack(user.id, boosterId);
    const cards = await enrichCards(locale, result);
    revalidatePath(`/${locale}/collection`);
    revalidatePath(`/${locale}/boosters`);
    return { ok: true, result, cards };
  } catch (e) {
    if (e instanceof Error && e.message === "insufficient_balance") {
      return { ok: false, error: "insufficient_balance" };
    }
    return { ok: false, error: "failed" };
  }
}

/** Opens an emplacement of the player's offre boutique; shares openBooster's rate limit. */
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

  const cards = await enrichCards(outcome.locale, outcome.result);
  return { ok: true, result: outcome.result, cards };
}
