/** Ordered showcase slots on a player profile (GLOSSARY: Vitrine profil). */
export const SHOWCASE_SLOT_COUNT = 6;

export const SHOWCASE_SLOT_MIN = 1;
export const SHOWCASE_SLOT_MAX = SHOWCASE_SLOT_COUNT;

export type ShowcaseSlot = {
  slot: number;
  card_id: string | null;
};

/** Slot 1 is the former single featured card, kept for display until the full showcase UI lands. */
export const FEATURED_SHOWCASE_SLOT = 1;
