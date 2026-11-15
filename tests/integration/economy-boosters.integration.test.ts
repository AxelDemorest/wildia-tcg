/**
 * The coin economy and booster opening, as players use them (signed-in client, own account).
 * Rules in docs/economy.md. Runs against the local Supabase: npm run test:integration.
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  admin,
  balanceOf,
  cleanup,
  createBooster,
  createCard,
  createPlayer,
  giveCoins,
  grantCard,
  ledgerOf,
  setAwayFor,
  sql,
  type Player,
} from "./supabase";

afterAll(cleanup);

type SyncResult = { balance: number; accrued: number; delta_seconds: number };
type DrawnCard = { card_id: string; slug: string; rarity: string };
type OpenResult = { draw_id: string; balance: number; cost: number; cards: DrawnCard[] };

async function sync(player: Player): Promise<SyncResult> {
  const { data, error } = await player.client.rpc("sync_user_economy", { p_user_id: player.id });
  if (error) throw error;
  return {
    balance: Number(data.balance),
    accrued: Number(data.accrued),
    delta_seconds: Number(data.delta_seconds),
  };
}

function open(player: Player, boosterId: string) {
  return player.client.rpc("open_booster_pack", {
    p_booster_id: boosterId,
    p_user_id: player.id,
  }) as unknown as Promise<{ data: OpenResult | null; error: { message: string } | null }>;
}

async function multiplier(): Promise<number> {
  const { data, error } = await admin
    .from("economy_config")
    .select("value")
    .eq("key", "farm_global_multiplier")
    .single();
  if (error) throw error;
  return Number(data.value);
}

async function setMultiplier(value: number): Promise<void> {
  const { error } = await admin
    .from("economy_config")
    .update({ value })
    .eq("key", "farm_global_multiplier");
  if (error) throw error;
}

/** A player whose cards farm 1 coin per second in total: 0.5 × 1 + 0.25 × 2. */
async function playerFarmingOneCoinPerSecond(): Promise<Player> {
  const player = await createPlayer();
  await grantCard(player.id, await createCard("common", 0.5), 1);
  await grantCard(player.id, await createCard("common", 0.25), 2);
  return player;
}

async function inventoryOf(userId: string): Promise<Map<string, number>> {
  const { data, error } = await admin
    .from("user_cards")
    .select("card_id, quantity")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(data.map((row) => [row.card_id, row.quantity]));
}

async function drawsOf(userId: string) {
  const { data, error } = await admin
    .from("draw_logs")
    .select("id, booster_id, results, roll_seed")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

describe("farm (sync_user_economy)", () => {
  it("credits floor(Σ rate × copies × elapsed seconds × multiplier) and logs how", async () => {
    const player = await playerFarmingOneCoinPerSecond();
    await setAwayFor(player.id, 3600);
    const m = await multiplier();

    const result = await sync(player);

    expect(result.delta_seconds).toBeGreaterThanOrEqual(3600);
    expect(result.accrued).toBe(Math.floor(1 * result.delta_seconds * m));
    expect(result.balance).toBe(result.accrued);
    const [row] = await ledgerOf(player.id, "farm_accrual");
    expect(row.amount).toBe(result.accrued);
    expect(row.metadata).toMatchObject({ farm_rate_per_sec: 1, multiplier: m });
  });

  it("applies the global multiplier from economy_config", async () => {
    const player = await playerFarmingOneCoinPerSecond();
    await setAwayFor(player.id, 3600);
    const original = await multiplier();
    await setMultiplier(2);
    try {
      const result = await sync(player);
      expect(result.accrued).toBe(Math.floor(1 * result.delta_seconds * 2));
    } finally {
      await setMultiplier(original);
    }
  });

  it("writes nothing when less than a coin has accrued", async () => {
    const player = await playerFarmingOneCoinPerSecond();
    await sync(player);

    const again = await sync(player);

    expect(again.accrued).toBe(0);
    expect(await ledgerOf(player.id, "farm_accrual")).toHaveLength(0);
  });

  it("credits nothing to a player without cards, however long they were away", async () => {
    const player = await createPlayer();
    await setAwayFor(player.id, 30 * 24 * 3600);

    const result = await sync(player);

    expect(result.accrued).toBe(0);
    expect(await ledgerOf(player.id)).toHaveLength(0);
  });

  it("credits the time away only once when several syncs arrive at the same moment", async () => {
    const player = await playerFarmingOneCoinPerSecond();
    await setAwayFor(player.id, 3600);

    const results = await Promise.all(Array.from({ length: 5 }, () => sync(player)));

    const credits = await ledgerOf(player.id, "farm_accrual");
    expect(credits).toHaveLength(1);
    expect(credits[0].amount).toBeGreaterThanOrEqual(3600);
    expect(credits[0].amount).toBeLessThan(3610);
    expect(results.reduce((sum, r) => sum + r.accrued, 0)).toBe(credits[0].amount);
  });
});

describe("booster opening (open_booster_pack)", () => {
  it("charges the price once, draws one card per slot and records the draw", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("rare");
    const boosterId = await createBooster({ rare: 1 }, 100);

    const { data, error } = await open(player, boosterId);

    expect(error).toBeNull();
    expect(data!.cost).toBe(100);
    expect(data!.cards).toHaveLength(5);
    expect(data!.cards.every((card) => card.rarity === "rare")).toBe(true);
    expect(Number(data!.balance)).toBe(900);
    expect(await balanceOf(player.id)).toBe(900);

    const [purchase] = await ledgerOf(player.id, "booster_purchase");
    expect(purchase.amount).toBe(-100);
    expect(purchase.reference_id).toBe(data!.draw_id);

    const draws = await drawsOf(player.id);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ id: data!.draw_id, booster_id: boosterId });
    expect(draws[0].results).toEqual(data!.cards);
    expect(draws[0].roll_seed).toMatch(/^[0-9a-f]{32}$/);
  });

  it("adds every drawn card to the inventory, duplicates included", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("epic");
    const boosterId = await createBooster({ epic: 1 }, 100);

    const { data } = await open(player, boosterId);

    const expected = new Map<string, number>();
    for (const card of data!.cards) {
      expected.set(card.card_id, (expected.get(card.card_id) ?? 0) + 1);
    }
    expect(await inventoryOf(player.id)).toEqual(expected);

    const { data: grants } = await admin
      .from("user_card_grants")
      .select("source")
      .eq("user_id", player.id);
    expect(grants).toHaveLength(5);
    expect(grants!.every((grant) => grant.source === "booster_open")).toBe(true);
  });

  it("draws as many cards as the booster has slots", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 3);

    const { data } = await open(player, boosterId);

    expect(data!.cards).toHaveLength(3);
  });

  it("refuses when the balance is too low, and changes nothing", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 50);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100);

    const { error } = await open(player, boosterId);

    expect(error?.message).toBe("insufficient_balance");
    expect(await balanceOf(player.id)).toBe(50);
    expect(await drawsOf(player.id)).toHaveLength(0);
    expect((await inventoryOf(player.id)).size).toBe(0);
  });

  it("counts coins farmed while away before checking the price", async () => {
    const player = await playerFarmingOneCoinPerSecond();
    await setAwayFor(player.id, 200);
    const boosterId = await createBooster({ common: 1 }, 100);

    const { data, error } = await open(player, boosterId);

    expect(error).toBeNull();
    const [farmed] = await ledgerOf(player.id, "farm_accrual");
    expect(farmed.amount).toBeGreaterThanOrEqual(200);
    expect(Number(data!.balance)).toBe(farmed.amount - 100);
  });

  it("refuses an inactive booster, and charges nothing", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    const boosterId = await createBooster({ common: 1 }, 100, false);

    const { error } = await open(player, boosterId);

    expect(error?.message).toBe("booster not found");
    expect(await balanceOf(player.id)).toBe(1000);
  });

  it("sells only one booster when two openings race for the price of one", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 150);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100);

    const results = await Promise.all([open(player, boosterId), open(player, boosterId)]);

    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(results.filter((r) => r.error?.message === "insufficient_balance")).toHaveLength(1);
    expect(await balanceOf(player.id)).toBe(50);
    expect(await drawsOf(player.id)).toHaveLength(1);
  });
});

describe("rarity draw (pick_weighted_rarity)", () => {
  function drawMany(weights: Record<string, number>, times: number): Record<string, number> {
    const rows = sql<{ rarity: string; n: number }>(
      `select r::text as rarity, count(*)::int as n
       from (select public.pick_weighted_rarity('${JSON.stringify(weights)}'::jsonb) r
             from generate_series(1, ${times})) draws
       group by 1`,
    );
    return Object.fromEntries(rows.map((row) => [row.rarity, row.n]));
  }

  it("follows the weights, each draw independent even within one query", () => {
    const counts = drawMany({ common: 1, rare: 1 }, 400);

    expect(Object.keys(counts).sort()).toEqual(["common", "rare"]);
    expect(counts.common).toBeGreaterThan(140);
    expect(counts.rare).toBeGreaterThan(140);
  });

  it("never draws a rarity with no weight", () => {
    expect(drawMany({ common: 1, mythic: 0 }, 200)).toEqual({ common: 200 });
  });

  it("falls back to common when no rarity has a weight", () => {
    expect(drawMany({}, 20)).toEqual({ common: 20 });
  });
});
