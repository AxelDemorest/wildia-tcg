/**
 * Boutique boosters: opening a booster from an emplacement of the offre boutique.
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseOpenBoosterResult } from "@/lib/boosters/open-result";
import { parseBoosterShopOffer } from "@/lib/boosters/shop";
import {
  admin,
  balanceOf,
  cleanup,
  createBooster,
  createCard,
  createPlayer,
  drawsOf,
  giveCoins,
  inventoryOf,
  ledgerOf,
  moveShopOffer,
  setShopSlot,
  shopSlotExhaustionOf,
  shopSlotsOf,
  shopWindowNow,
  waitForShopWindowMargin,
  type Player,
} from "./supabase";

afterAll(cleanup);

// A window change between two calls of a test would make the opening refuse as window_closed.
beforeEach(() => waitForShopWindowMargin(30), 45_000);

async function readWindow(player: Player): Promise<number> {
  const { data, error } = await player.client.rpc("get_booster_shop_offer");
  if (error) throw error;
  return parseBoosterShopOffer(data).windowIndex;
}

function openSlot(player: Player, windowIndex: number, slotIndex: number) {
  return player.client.rpc("open_booster_shop_slot", {
    p_window_index: windowIndex,
    p_slot_index: slotIndex,
  });
}

describe("opening from an emplacement (open_booster_shop_slot)", () => {
  it("debits the price once, draws the cards, grants them and marks only that emplacement exhausted", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("rare");
    const boosterId = await createBooster({ rare: 1 }, 100, true, 5, 0);
    const windowIndex = await readWindow(player);
    await setShopSlot(player.id, windowIndex, 1, boosterId);

    const { data, error } = await openSlot(player, windowIndex, 1);

    expect(error).toBeNull();
    const result = parseOpenBoosterResult(data);
    expect(result.cost).toBe(100);
    expect(result.cards).toHaveLength(5);
    expect(result.balance).toBe(900);
    expect(await balanceOf(player.id)).toBe(900);

    const purchases = await ledgerOf(player.id, "booster_purchase");
    expect(purchases).toHaveLength(1);
    expect(purchases[0].amount).toBe(-100);
    expect(purchases[0].reference_id).toBe(result.drawId);
    const { data: booster, error: boosterError } = await admin
      .from("booster_definitions")
      .select("slug")
      .eq("id", boosterId)
      .single();
    if (boosterError) throw boosterError;
    expect(purchases[0].metadata).toMatchObject({ booster_slug: booster.slug });

    const draws = await drawsOf(player.id);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ id: result.drawId, booster_id: boosterId });

    const expected = new Map<string, number>();
    for (const card of result.cards) {
      expected.set(card.cardId, (expected.get(card.cardId) ?? 0) + 1);
    }
    expect(await inventoryOf(player.id)).toEqual(expected);
    const { data: grants, error: grantsError } = await admin
      .from("user_card_grants")
      .select("source")
      .eq("user_id", player.id);
    if (grantsError) throw grantsError;
    expect(grants).toHaveLength(5);
    expect(grants.every((grant) => grant.source === "booster_open")).toBe(true);

    const slots = await shopSlotExhaustionOf(player.id, windowIndex);
    const opened = slots.find((slot) => slot.slot_index === 1)!;
    expect(opened.opened_at).not.toBeNull();
    expect(opened.draw_id).toBe(result.drawId);
    const untouched = slots.find((slot) => slot.slot_index === 0)!;
    expect(untouched).toEqual({ slot_index: 0, opened_at: null, draw_id: null });
  });
});

/** A player with coins whose slots 0 and 1 of the current offre hold the given boosters. */
async function playerWithSlots(coins: number, ...boosterIds: string[]) {
  const player = await createPlayer();
  if (coins > 0) await giveCoins(player.id, coins);
  const windowIndex = await readWindow(player);
  for (const [slotIndex, boosterId] of boosterIds.entries()) {
    await setShopSlot(player.id, windowIndex, slotIndex, boosterId);
  }
  return { player, windowIndex };
}

async function exhaustedIndexes(player: Player, windowIndex: number): Promise<number[]> {
  const slots = await shopSlotExhaustionOf(player.id, windowIndex);
  return slots.filter((slot) => slot.opened_at !== null).map((slot) => slot.slot_index);
}

describe("opening the same emplacement twice", () => {
  // Would catch: an opening that does not mark the emplacement, or a marking that is not checked.
  it("refuses the second opening of an index as slot_exhausted, with one debit, one draw and the balance untouched by the refusal", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);
    const first = await openSlot(player, windowIndex, 0);
    expect(first.error).toBeNull();
    expect(await balanceOf(player.id)).toBe(900);

    const second = await openSlot(player, windowIndex, 0);

    expect(second.error?.message).toBe("slot_exhausted");
    expect(await balanceOf(player.id)).toBe(900);
    expect(await ledgerOf(player.id, "booster_purchase")).toHaveLength(1);
    expect(await drawsOf(player.id)).toHaveLength(1);
  });

  // Would catch: no row lock on the emplacement (check then mark race): several openings pass.
  it("lets only one of three concurrent openings of the same emplacement through, with the balance enough for three", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);

    const results = await Promise.all([
      openSlot(player, windowIndex, 0),
      openSlot(player, windowIndex, 0),
      openSlot(player, windowIndex, 0),
    ]);

    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    const refused = results.filter((r) => r.error !== null);
    expect(refused.map((r) => r.error?.message)).toEqual(["slot_exhausted", "slot_exhausted"]);
    expect(await balanceOf(player.id)).toBe(900);
    expect(await ledgerOf(player.id, "booster_purchase")).toHaveLength(1);
    expect(await drawsOf(player.id)).toHaveLength(1);
  });
});

describe("the emplacement decides the booster", () => {
  // Would catch: opening slot 0's booster (or the cheapest) whatever the index, or marking the wrong index.
  it("opens the booster stored at the requested index, at its price, and leaves the other index available", async () => {
    await createCard("common");
    await createCard("rare");
    const a = await createBooster({ common: 1 }, 100, true, 5, 0);
    const b = await createBooster({ rare: 1 }, 200, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, a, b);

    const { data, error } = await openSlot(player, windowIndex, 1);

    expect(error).toBeNull();
    expect(parseOpenBoosterResult(data).cost).toBe(200);
    const [draw] = await drawsOf(player.id);
    expect(draw.booster_id).toBe(b);
    const rarities = (draw.results as { rarity: string }[]).map((entry) => entry.rarity);
    expect(rarities).toEqual(Array(5).fill("rare"));
    expect(await balanceOf(player.id)).toBe(800);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([1]);
  });
});

describe("an index that is not an emplacement of the offre", () => {
  async function slotCount(player: Player): Promise<number> {
    const { data, error } = await player.client.rpc("get_booster_shop_offer");
    if (error) throw error;
    return parseBoosterShopOffer(data).slots.length;
  }

  // Would catch: no existence check (negative or out of range index opens something, or an
  // emplacement is created on the fly).
  it.each([
    ["-1", () => -1],
    ["the slot count", (count: number) => count],
    ["999", () => 999],
  ])("refuses %s as slot_not_found, nothing debited, no draw", async (_label, indexOf) => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);
    const before = await shopSlotsOf(player.id);

    const { error } = await openSlot(player, windowIndex, indexOf(await slotCount(player)));

    expect(error?.message).toBe("slot_not_found");
    expect(await balanceOf(player.id)).toBe(1000);
    expect(await drawsOf(player.id)).toHaveLength(0);
    expect(await shopSlotsOf(player.id)).toEqual(before);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([]);
  });

  // Would catch: opening that generates or draws an offre on the fly for a player who has none.
  it("refuses a player with no stored offre in the window as slot_not_found, without creating an offre", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);

    const { error } = await openSlot(player, shopWindowNow(), 0);

    expect(error?.message).toBe("slot_not_found");
    expect(await shopSlotsOf(player.id)).toEqual([]);
    expect(await balanceOf(player.id)).toBe(1000);
    expect(await drawsOf(player.id)).toHaveLength(0);
  });
});

describe("a page left open on an old window", () => {
  // Would catch: the window index of the request ignored (opening the current offre's slot, or an old stored row).
  it("refuses the previous window and a future one as window_closed, leaving the current slot available", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    const windowIndex = await readWindow(player);
    await moveShopOffer(player.id, windowIndex - 1);
    expect(await readWindow(player)).toBe(windowIndex);
    await setShopSlot(player.id, windowIndex, 0, boosterId);

    const stale = await openSlot(player, windowIndex - 1, 0);
    const future = await openSlot(player, windowIndex + 1, 0);

    expect(stale.error?.message).toBe("window_closed");
    expect(future.error?.message).toBe("window_closed");
    expect(await balanceOf(player.id)).toBe(1000);
    expect(await drawsOf(player.id)).toHaveLength(0);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([]);
  });
});

describe("balance", () => {
  // Would catch: the debit not checked, or the emplacement marked before the balance check
  // outside the transaction (slot consumed by a refusal).
  it("refuses a balance too low as insufficient_balance, changes nothing, then opens the same emplacement once credited", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(50, boosterId);

    const refused = await openSlot(player, windowIndex, 0);

    expect(refused.error?.message).toBe("insufficient_balance");
    expect(await balanceOf(player.id)).toBe(50);
    expect((await inventoryOf(player.id)).size).toBe(0);
    expect(await drawsOf(player.id)).toHaveLength(0);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([]);

    await giveCoins(player.id, 100);
    const retry = await openSlot(player, windowIndex, 0);

    expect(retry.error).toBeNull();
    expect(await balanceOf(player.id)).toBe(50);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([0]);
  });

  // Would catch: a balance read outside the profile lock: both openings see the full balance.
  it("lets only one of two concurrent openings of different emplacements through when the balance covers one price", async () => {
    await createCard("common");
    const a = await createBooster({ common: 1 }, 100, true, 5, 0);
    const b = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(100, a, b);

    const results = await Promise.all([
      openSlot(player, windowIndex, 0),
      openSlot(player, windowIndex, 1),
    ]);

    const succeeded = results.filter((r) => r.error === null);
    const refused = results.filter((r) => r.error !== null);
    expect(succeeded).toHaveLength(1);
    expect(refused.map((r) => r.error?.message)).toEqual(["insufficient_balance"]);
    expect(await balanceOf(player.id)).toBe(0);
    expect(await drawsOf(player.id)).toHaveLength(1);
    const refusedIndex = results[0].error ? 0 : 1;
    const exhausted = await exhaustedIndexes(player, windowIndex);
    expect(exhausted).toEqual([1 - refusedIndex]);
  });
});

describe("the définition changes during the window", () => {
  // Would catch: opening a deactivated définition (no is_active check), or exhausting the slot on refusal.
  it("refuses a deactivated définition as booster_unavailable, no debit, emplacement still available", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);
    const { error: deactivateError } = await admin
      .from("booster_definitions")
      .update({ is_active: false })
      .eq("id", boosterId);
    if (deactivateError) throw deactivateError;

    const { error } = await openSlot(player, windowIndex, 0);

    expect(error?.message).toBe("booster_unavailable");
    expect(await balanceOf(player.id)).toBe(1000);
    expect(await drawsOf(player.id)).toHaveLength(0);
    expect(await exhaustedIndexes(player, windowIndex)).toEqual([]);
  });

  // Would catch: a price snapshotted when the offre was stored, instead of the current price.
  it("debits the current price when an admin changed cost_coins during the window", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);
    const { error: updateError } = await admin
      .from("booster_definitions")
      .update({ cost_coins: 150 })
      .eq("id", boosterId);
    if (updateError) throw updateError;

    const { data, error } = await openSlot(player, windowIndex, 0);

    expect(error).toBeNull();
    expect(parseOpenBoosterResult(data).cost).toBe(150);
    expect(await balanceOf(player.id)).toBe(850);
  });
});

describe("get_booster_shop_offer and exhausted emplacements", () => {
  // Would catch: exhausted missing, always false, or true for every emplacement; or an exhausted
  // state that survives into the next window's offre.
  it("flags only the opened emplacement as exhausted, and a new window offre has none exhausted", async () => {
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { player, windowIndex } = await playerWithSlots(1000, boosterId);
    const opened = await openSlot(player, windowIndex, 0);
    expect(opened.error).toBeNull();

    const { data, error } = await player.client.rpc("get_booster_shop_offer");
    if (error) throw error;
    const flags = (data.slots as { slot_index: number; exhausted: boolean }[]).map((slot) => [
      slot.slot_index,
      slot.exhausted,
    ]);

    expect(flags[0]).toEqual([0, true]);
    expect(flags.slice(1).every(([, exhausted]) => exhausted === false)).toBe(true);

    await moveShopOffer(player.id, windowIndex - 1);
    const next = await player.client.rpc("get_booster_shop_offer");
    if (next.error) throw next.error;

    expect(next.data.window_index).toBe(windowIndex);
    expect(
      (next.data.slots as { exhausted: boolean }[]).every((slot) => slot.exhausted === false),
    ).toBe(true);
  });
});
