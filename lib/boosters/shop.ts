export type BoosterShopSlot = {
  slotIndex: number;
  exhausted: boolean;
  booster: {
    id: string;
    slug: string;
    costCoins: number;
    slots: number;
  };
};

export type BoosterShopOffer = {
  windowIndex: number;
  endsAt: string;
  slots: BoosterShopSlot[];
};

/** Reads the JSON returned by the get_booster_shop_offer RPC; throws on an unexpected shape. */
export function parseBoosterShopOffer(data: unknown): BoosterShopOffer {
  if (!data || typeof data !== "object") throw new Error("Invalid shop offer response");
  const row = data as Record<string, unknown>;
  const slotsRaw = row.slots;
  if (!Array.isArray(slotsRaw)) throw new Error("Invalid shop slots payload");

  const slots: BoosterShopSlot[] = slotsRaw.map((s) => {
    const item = s as Record<string, unknown>;
    const booster = item.booster as Record<string, unknown>;
    return {
      slotIndex: Number(item.slot_index),
      exhausted: Boolean(item.exhausted),
      booster: {
        id: String(booster.id),
        slug: String(booster.slug),
        costCoins: Number(booster.cost_coins),
        slots: Number(booster.slots),
      },
    };
  });

  return {
    windowIndex: Number(row.window_index),
    endsAt: String(row.ends_at),
    slots,
  };
}

/**
 * Length of a fenêtre boutique in seconds. Windows are counted from the Unix epoch, so the end of
 * window N is (N + 1) × length: the client derives it instead of hard-coding the SQL value.
 */
export function shopWindowSeconds(offer: Pick<BoosterShopOffer, "windowIndex" | "endsAt">): number {
  return Math.round(Date.parse(offer.endsAt) / 1000 / (offer.windowIndex + 1));
}

/**
 * Picks a booster type from shop weights; mirrors SQL private.pick_shop_booster with injectable RNG.
 * Pass candidates in the SQL order (sort_order, then id) for identical results.
 */
export function pickWeightedBoosterType<T extends { shopWeight: number }>(
  candidates: T[],
  random: () => number = Math.random,
): T | null {
  const eligible = candidates.filter((c) => c.shopWeight > 0);
  const total = eligible.reduce((sum, c) => sum + c.shopWeight, 0);
  if (total <= 0) return null;

  let roll = random() * total;
  for (const candidate of eligible) {
    roll -= candidate.shopWeight;
    if (roll < 0) return candidate;
  }
  return eligible[eligible.length - 1];
}
