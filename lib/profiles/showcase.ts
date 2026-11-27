import type { CatalogCard } from "@/lib/cards/types";

/** Ordered showcase slots on a player profile (GLOSSARY: Vitrine profil). */
export const SHOWCASE_SLOT_COUNT = 6;

export const SHOWCASE_SLOT_MIN = 1;
export const SHOWCASE_SLOT_MAX = SHOWCASE_SLOT_COUNT;

export type ShowcaseSlot = {
  slot: number;
  card_id: string | null;
};

export type ShowcaseSlotView = {
  slot: number;
  card: CatalogCard | null;
};

/** Slot 1 is the former single featured card, kept for display until the full showcase UI lands. */
export const FEATURED_SHOWCASE_SLOT = 1;

export type ShowcaseSlotSelection = (string | null)[];

/** Builds a fixed-length slot list (1..6) from persisted rows. */
export function showcaseSlotsFromRows(
  rows: readonly ShowcaseSlot[],
): ShowcaseSlotSelection {
  const bySlot = new Map(rows.map((row) => [row.slot, row.card_id]));
  return Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) => bySlot.get(index + 1) ?? null);
}

export function validateShowcaseSlotSelection(
  slots: readonly (string | null)[],
): { ok: true } | { ok: false; reason: "duplicate" | "invalid_length" } {
  if (slots.length !== SHOWCASE_SLOT_COUNT) {
    return { ok: false, reason: "invalid_length" };
  }
  const seen = new Set<string>();
  for (const cardId of slots) {
    if (!cardId) continue;
    if (seen.has(cardId)) return { ok: false, reason: "duplicate" };
    seen.add(cardId);
  }
  return { ok: true };
}
