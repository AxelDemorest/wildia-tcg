/**
 * What a signed-in player can and cannot change through the public API, around the coin
 * economy. Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  admin,
  cleanup,
  createCard,
  createPlayer,
  deletePlayer,
  grantCard,
  type Player,
} from "./supabase";

afterAll(cleanup);

async function readProfile(id: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("last_economy_sync_at, created_at, featured_card_id, display_name, bio, is_public")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function addLedgerRow(player: Player): Promise<string> {
  const { data, error } = await admin
    .from("currency_ledger")
    .insert({ user_id: player.id, amount: 100, type: "admin_adjust" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function readLedgerRow(id: string) {
  const { data, error } = await admin
    .from("currency_ledger")
    .select("amount")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

describe("profiles: what a player may change on their own row", () => {
  it("cannot move their farm clock back to earn coins for time that did not pass", async () => {
    const player = await createPlayer();
    const before = await readProfile(player.id);

    const { error } = await player.client
      .from("profiles")
      .update({ last_economy_sync_at: "2000-01-01T00:00:00Z" })
      .eq("id", player.id);

    expect(error?.code).toBe("42501");
    expect((await readProfile(player.id)).last_economy_sync_at).toBe(before.last_economy_sync_at);
  });

  it("cannot rewrite when their account was created", async () => {
    const player = await createPlayer();
    const before = await readProfile(player.id);

    const { error } = await player.client
      .from("profiles")
      .update({ created_at: "2000-01-01T00:00:00Z" })
      .eq("id", player.id);

    expect(error?.code).toBe("42501");
    expect((await readProfile(player.id)).created_at).toBe(before.created_at);
  });

  it("cannot feature a card they do not own", async () => {
    const player = await createPlayer();
    const cardId = await createCard("mythic");

    const { error } = await player.client
      .from("profiles")
      .update({ featured_card_id: cardId })
      .eq("id", player.id);

    expect(error).not.toBeNull();
    expect((await readProfile(player.id)).featured_card_id).toBeNull();
  });

  it("can feature a card they own, then clear it", async () => {
    const player = await createPlayer();
    const cardId = await createCard("common");
    await grantCard(player.id, cardId);

    const set = await player.client
      .from("profiles")
      .update({ featured_card_id: cardId })
      .eq("id", player.id);
    expect(set.error).toBeNull();
    expect((await readProfile(player.id)).featured_card_id).toBe(cardId);

    const clear = await player.client
      .from("profiles")
      .update({ featured_card_id: null })
      .eq("id", player.id);
    expect(clear.error).toBeNull();
    expect((await readProfile(player.id)).featured_card_id).toBeNull();
  });

  it("can still save everything the profile page and banner upload write", async () => {
    const player = await createPlayer();

    const { error } = await player.client
      .from("profiles")
      .update({
        display_name: "Testeur",
        bio: "Bio de test",
        is_public: true,
        banner_url: `${player.id}/banner.png`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", player.id);

    expect(error).toBeNull();
    expect(await readProfile(player.id)).toMatchObject({
      display_name: "Testeur",
      bio: "Bio de test",
      is_public: true,
    });
  });
});

describe("currency ledger", () => {
  it("cannot be changed or erased by the player it belongs to", async () => {
    const player = await createPlayer();
    const rowId = await addLedgerRow(player);

    await player.client.from("currency_ledger").update({ amount: 1_000_000 }).eq("id", rowId);
    await player.client.from("currency_ledger").delete().eq("id", rowId);

    expect(await readLedgerRow(rowId)).toEqual({ amount: 100 });
  });

  it("stays append-only for the service role while the player exists", async () => {
    const player = await createPlayer();
    const rowId = await addLedgerRow(player);

    const update = await admin.from("currency_ledger").update({ amount: 0 }).eq("id", rowId);
    const remove = await admin.from("currency_ledger").delete().eq("id", rowId);

    expect(update.error?.message).toContain("append-only");
    expect(remove.error?.message).toContain("append-only");
    expect(await readLedgerRow(rowId)).toEqual({ amount: 100 });
  });

  it("does not block deleting a player's account, and goes with it", async () => {
    const player = await createPlayer();
    const rowId = await addLedgerRow(player);

    const { error } = await deletePlayer(player);

    expect(error).toBeNull();
    expect(await readLedgerRow(rowId)).toBeNull();
  });
});
