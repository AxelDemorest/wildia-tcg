import "server-only";

import type { CatalogCard } from "@/lib/cards/types";
import { SHOWCASE_SLOT_COUNT, type ShowcaseSlotView } from "@/lib/profiles/showcase";
import { getCatalogCardById } from "@/server/cards/queries";
import { listShowcaseSlots } from "@/server/profiles/showcase";

export async function getProfileShowcaseView(
  profileId: string,
  locale: string,
): Promise<ShowcaseSlotView[]> {
  const rows = await listShowcaseSlots(profileId);
  const bySlot = new Map(rows.map((row) => [row.slot, row.card_id]));

  const slots = await Promise.all(
    Array.from({ length: SHOWCASE_SLOT_COUNT }, async (_, index) => {
      const slot = index + 1;
      const cardId = bySlot.get(slot) ?? null;
      let card: CatalogCard | null = null;
      if (cardId) {
        card = await getCatalogCardById(locale, cardId).catch(() => null);
      }
      return { slot, card };
    }),
  );

  return slots;
}