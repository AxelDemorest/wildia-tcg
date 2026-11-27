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

describe("profiles created at signup (handle_new_user)", () => {
  async function signupProfile(metadata?: Record<string, unknown>) {
    const player = await createPlayer(metadata);
    const { data, error } = await admin
      .from("profiles")
      .select("display_name, locale")
      .eq("id", player.id)
      .single();
    if (error) throw error;
    return { player, profile: data };
  }

  it("takes the display name from the e-mail, cut to 40 characters", async () => {
    const { player, profile } = await signupProfile();

    expect(profile.display_name).toBe(player.email.split("@")[0].slice(0, 40));
  });

  it("trims and cuts a display name sent at signup", async () => {
    const { profile } = await signupProfile({ display_name: `  ${"x".repeat(100)}  ` });

    expect(profile.display_name).toBe("x".repeat(40));
  });

  it("falls back to the e-mail when the display name sent is blank", async () => {
    const { player, profile } = await signupProfile({ display_name: "   " });

    expect(profile.display_name).toBe(player.email.split("@")[0].slice(0, 40));
  });

  it("keeps the language sent at signup only if the site supports it", async () => {
    expect((await signupProfile({ locale: "en" })).profile.locale).toBe("en");
    expect((await signupProfile({ locale: "xx" })).profile.locale).toBe("fr");
  });
});

async function readProfile(id: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("last_economy_sync_at, created_at, display_name, bio, is_public")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function readShowcaseSlots(profileId: string) {
  const { data, error } = await admin
    .from("profile_showcase_slots")
    .select("slot, card_id")
    .eq("profile_id", profileId)
    .order("slot");
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

  it("cannot put a card they do not own in a showcase slot", async () => {
    const player = await createPlayer();
    const cardId = await createCard("mythic");

    const { error } = await player.client.from("profile_showcase_slots").upsert({
      profile_id: player.id,
      slot: 1,
      card_id: cardId,
    });

    expect(error).not.toBeNull();
    expect(await readShowcaseSlots(player.id)).toEqual([]);
  });

  it("can fill up to six showcase slots with owned cards, then clear a slot", async () => {
    const player = await createPlayer();
    const cardIds = await Promise.all(
      Array.from({ length: 6 }, () => createCard("common")),
    );
    for (const cardId of cardIds) {
      await grantCard(player.id, cardId);
    }

    for (let slot = 1; slot <= 6; slot++) {
      const { error } = await player.client.from("profile_showcase_slots").upsert({
        profile_id: player.id,
        slot,
        card_id: cardIds[slot - 1],
      });
      expect(error).toBeNull();
    }

    expect(await readShowcaseSlots(player.id)).toEqual(
      cardIds.map((card_id, index) => ({ slot: index + 1, card_id })),
    );

    const clear = await player.client.from("profile_showcase_slots").upsert({
      profile_id: player.id,
      slot: 3,
      card_id: null,
    });
    expect(clear.error).toBeNull();
    expect((await readShowcaseSlots(player.id)).find((row) => row.slot === 3)?.card_id).toBeNull();
  });

  it("rejects a seventh showcase slot", async () => {
    const player = await createPlayer();

    const { error } = await player.client.from("profile_showcase_slots").upsert({
      profile_id: player.id,
      slot: 7,
      card_id: null,
    });

    expect(error?.code).toBe("23514");
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

  // The profile page validates these limits (lib/profiles/profile-form.ts), but players can
  // write these columns through the API directly, so the database holds the same limits.
  it.each([
    ["a display name over 40 characters", { display_name: "x".repeat(41) }],
    ["a blank display name", { display_name: "   " }],
    ["a bio over 500 characters", { bio: "x".repeat(501) }],
  ])("cannot save %s", async (_label, change) => {
    const player = await createPlayer();
    const before = await readProfile(player.id);

    const { error } = await player.client.from("profiles").update(change).eq("id", player.id);

    expect(error?.code).toBe("23514");
    expect(await readProfile(player.id)).toEqual(before);
  });

  it("cannot point their banner at another player's file or at any other address", async () => {
    const player = await createPlayer();
    const other = await createPlayer();

    for (const banner_url of [
      `${other.id}/banner.png`,
      `${player.id}/../${other.id}/banner.png`,
      "https://example.com/banner.png",
    ]) {
      const { error } = await player.client
        .from("profiles")
        .update({ banner_url })
        .eq("id", player.id);
      expect(error?.code).toBe("23514");
    }
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
