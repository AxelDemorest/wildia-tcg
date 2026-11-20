/**
 * Boutique boosters: the offre boutique a player gets for the current fenêtre boutique.
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseBoosterShopOffer, type BoosterShopOffer } from "@/lib/boosters/shop";
import {
  admin,
  cleanup,
  createBooster,
  createPlayer,
  moveShopOffer,
  setShopSlotCount,
  shopSlotsOf,
  shopWindowNow,
  sql,
  waitForShopWindowMargin,
  type Player,
} from "./supabase";

afterAll(cleanup);

// A window change between two reads of a test would make them differ.
beforeEach(() => waitForShopWindowMargin(30), 45_000);

async function readOffer(player: Player): Promise<BoosterShopOffer> {
  const { data, error } = await player.client.rpc("get_booster_shop_offer");
  if (error) throw error;
  return parseBoosterShopOffer(data);
}

async function setShopWeight(boosterId: string, shopWeight: number): Promise<void> {
  const { error } = await admin
    .from("booster_definitions")
    .update({ shop_weight: shopWeight })
    .eq("id", boosterId);
  if (error) throw error;
}

/** An active définition de booster that the draw never picks (shop_weight 0). */
function createWitness(): Promise<string> {
  return createBooster({ common: 1 }, 100, true, 5, 0);
}

async function slotCount(): Promise<number> {
  const { data, error } = await admin
    .from("economy_config")
    .select("value")
    .eq("key", "booster_shop_slot_count")
    .single();
  if (error) throw error;
  return Number(data.value);
}

describe("offre boutique", () => {
  it("gives a signed-in player one emplacement per configured count, each on an eligible définition de booster", async () => {
    const player = await createPlayer();

    const { data, error } = await player.client.rpc("get_booster_shop_offer");

    expect(error).toBeNull();
    const offer = parseBoosterShopOffer(data);
    const expectedCount = await slotCount();
    expect(offer.slots.map((slot) => slot.slotIndex)).toEqual(
      Array.from({ length: expectedCount }, (_, i) => i),
    );

    const { data: eligible, error: eligibleError } = await admin
      .from("booster_definitions")
      .select("id, slug, cost_coins, slots")
      .eq("is_active", true)
      .gt("shop_weight", 0);
    if (eligibleError) throw eligibleError;
    const byId = new Map(eligible.map((row) => [row.id, row]));
    for (const slot of offer.slots) {
      const definition = byId.get(slot.booster.id);
      expect(definition, `définition ${slot.booster.id} not eligible`).toBeDefined();
      expect(slot.booster.slug).toBe(definition!.slug);
      expect(slot.booster.costCoins).toBe(Number(definition!.cost_coins));
      expect(slot.booster.slots).toBe(definition!.slots);
    }
  });
});

describe("offre boutique, nombre d'emplacements par défaut", () => {
  it("is configured for 8 emplacements, and a fresh player's offre has 8", async () => {
    // Two rows of 4 on desktop: the default shipped by the migrations.
    expect(await slotCount()).toBe(8);

    const player = await createPlayer();
    const offer = await readOffer(player);

    expect(offer.slots.map((slot) => slot.slotIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe("offre boutique, persistance", () => {
  it("stores one row per emplacement for the fenêtre boutique, and a second read returns the same offre", async () => {
    const player = await createPlayer();

    const first = await readOffer(player);
    const second = await readOffer(player);

    const expectedCount = await slotCount();
    const stored = await shopSlotsOf(player.id);
    expect(stored).toHaveLength(expectedCount);
    expect(stored).toEqual(
      first.slots.map((slot) => ({
        window_index: first.windowIndex,
        slot_index: slot.slotIndex,
        booster_id: slot.booster.id,
      })),
    );
    expect(second).toEqual(first);
  });

  it("returns the stored offre, not a new draw", async () => {
    const player = await createPlayer();
    const first = await readOffer(player);
    const witness = await createWitness();
    await moveShopOffer(player.id, first.windowIndex, witness);

    const second = await readOffer(player);

    expect(second.slots.map((slot) => slot.booster.id)).toEqual(first.slots.map(() => witness));
  });

  it("keeps a définition de booster deactivated during the fenêtre boutique in the current offre", async () => {
    const player = await createPlayer();
    const first = await readOffer(player);
    const kept = await createWitness();
    const { error } = await admin
      .from("booster_shop_slots")
      .update({ booster_id: kept })
      .eq("user_id", player.id)
      .eq("window_index", first.windowIndex)
      .eq("slot_index", 0);
    if (error) throw error;
    const { error: deactivateError } = await admin
      .from("booster_definitions")
      .update({ is_active: false })
      .eq("id", kept);
    if (deactivateError) throw deactivateError;

    const second = await readOffer(player);

    expect(second.slots[0].booster.id).toBe(kept);
  });

  it("returns every emplacement once and stores a single offre when a new player's first reads run in parallel", async () => {
    const player = await createPlayer();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => player.client.rpc("get_booster_shop_offer")),
    );

    for (const result of results) expect(result.error).toBeNull();
    const offers = results.map((result) => parseBoosterShopOffer(result.data));
    for (const offer of offers) expect(offer).toEqual(offers[0]);
    expect(offers[0].slots).toHaveLength(await slotCount());
    expect(await shopSlotsOf(player.id)).toHaveLength(await slotCount());
  });
});

describe("fenêtre boutique", () => {
  it("is measured on the database clock, in 180 s windows ending on a boundary", async () => {
    const player = await createPlayer();

    const before = shopWindowNow();
    const offer = await readOffer(player);
    const after = shopWindowNow();

    expect(offer.windowIndex).toBeGreaterThanOrEqual(before);
    expect(offer.windowIndex).toBeLessThanOrEqual(after);
    expect(Date.parse(offer.endsAt)).toBe((offer.windowIndex + 1) * 180_000);
  });

  it("gives a new offre in the next fenêtre boutique and purges the player's past ones", async () => {
    const player = await createPlayer();
    const first = await readOffer(player);
    const witness = await createWitness();
    await moveShopOffer(player.id, first.windowIndex - 1, witness);

    const next = await readOffer(player);

    expect(next.windowIndex).toBe(first.windowIndex);
    expect(next.slots).toHaveLength(await slotCount());
    expect(next.slots.map((slot) => slot.booster.id)).not.toContain(witness);
    const stored = await shopSlotsOf(player.id);
    expect(stored.every((row) => row.window_index === next.windowIndex)).toBe(true);
  });

  it("purges the past offres of the player who reads only, not other players'", async () => {
    const reader = await createPlayer();
    const bystander = await createPlayer();
    const readerOffer = await readOffer(reader);
    await readOffer(bystander);
    await moveShopOffer(reader.id, readerOffer.windowIndex - 1);
    await moveShopOffer(bystander.id, readerOffer.windowIndex - 1);
    const bystanderBefore = await shopSlotsOf(bystander.id);

    await readOffer(reader);

    expect(bystanderBefore).toHaveLength(await slotCount());
    expect(await shopSlotsOf(bystander.id)).toEqual(bystanderBefore);
  });
});

describe("tirage des types de booster", () => {
  it("never offers an inactive définition de booster, nor an active one with a weight of 0", async () => {
    const inactiveHeavy = await createBooster({ common: 1 }, 100, false, 5, 1_000_000);
    const activeZero = await createWitness();
    const offers = [];
    for (let i = 0; i < 3; i++) offers.push(await readOffer(await createPlayer()));

    const ids = offers.flatMap((offer) => offer.slots.map((slot) => slot.booster.id));
    expect(ids).toHaveLength(3 * (await slotCount()));
    expect(ids).not.toContain(inactiveHeavy);
    expect(ids).not.toContain(activeZero);
  });

  it("follows shop_weight and draws each emplacement independently", async () => {
    const first = await createBooster({ common: 1 }, 100, true, 5, 0);
    const second = await createBooster({ common: 1 }, 100, true, 5, 0);
    try {
      await setShopWeight(first, 1_000_000);
      await setShopWeight(second, 1_000_000);
      const offers = [];
      for (let i = 0; i < 5; i++) offers.push(await readOffer(await createPlayer()));

      const chosen = new Set([first, second]);
      for (const offer of offers) {
        for (const slot of offer.slots) expect(chosen.has(slot.booster.id)).toBe(true);
      }
      const mixed = offers.some((offer) => {
        const ids = new Set(offer.slots.map((slot) => slot.booster.id));
        return ids.size === 2;
      });
      expect(mixed).toBe(true);
    } finally {
      await setShopWeight(first, 0);
      await setShopWeight(second, 0);
    }
  });

  it("draws independently even within a single query", async () => {
    const first = await createBooster({ common: 1 }, 100, true, 5, 0);
    const second = await createBooster({ common: 1 }, 100, true, 5, 0);
    try {
      await setShopWeight(first, 1_000_000);
      await setShopWeight(second, 1_000_000);

      const [row] = sql<{ n: number }>(
        "select count(distinct private.pick_shop_booster())::int as n from generate_series(1, 200)",
      );

      expect(row.n).toBeGreaterThan(1);
    } finally {
      await setShopWeight(first, 0);
      await setShopWeight(second, 0);
    }
  });

  it("takes the number of emplacements from the configuration", async () => {
    const original = await slotCount();
    const player = await createPlayer();
    try {
      await setShopSlotCount(3);
      const smaller = await readOffer(player);
      await setShopSlotCount(original);
      const sameWindow = await readOffer(player);
      await moveShopOffer(player.id, smaller.windowIndex - 1);
      const nextWindow = await readOffer(player);

      expect(smaller.slots).toHaveLength(3);
      expect(sameWindow.slots).toHaveLength(3);
      expect(nextWindow.slots).toHaveLength(original);
    } finally {
      await setShopSlotCount(original);
    }
  });

  it("offers nothing and stores nothing when no définition de booster is eligible", async () => {
    const { data, error } = await admin.from("booster_definitions").select("id, shop_weight");
    if (error) throw error;
    const player = await createPlayer();
    try {
      const { error: zeroError } = await admin
        .from("booster_definitions")
        .update({ shop_weight: 0 })
        .gte("shop_weight", 0);
      if (zeroError) throw zeroError;

      const offer = await readOffer(player);

      expect(offer.slots).toEqual([]);
      expect(await shopSlotsOf(player.id)).toEqual([]);
    } finally {
      for (const row of data ?? []) await setShopWeight(row.id, Number(row.shop_weight));
    }
  });
  it("bounds the number of emplacements between 0 and 20", async () => {
    const original = await slotCount();
    try {
      await setShopSlotCount(50);
      const tooMany = await createPlayer();
      const capped = await readOffer(tooMany);
      await setShopSlotCount(-3);
      const negative = await createPlayer();
      const empty = await readOffer(negative);

      expect(capped.slots).toHaveLength(20);
      expect(await shopSlotsOf(tooMany.id)).toHaveLength(20);
      expect(empty.slots).toEqual([]);
      expect(await shopSlotsOf(negative.id)).toEqual([]);
    } finally {
      await setShopSlotCount(original);
    }
  });
});
