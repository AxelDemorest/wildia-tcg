/**
 * Who can read and write each table and storage bucket through the public API: a visitor
 * (anon key, not signed in), the player who owns the data, and another player.
 * Policies are listed in docs/security.md. Runs against the local Supabase:
 * npm run test:integration.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBoosterShopOffer } from "@/lib/boosters/shop";
import {
  admin,
  cleanup,
  createBooster,
  createCard,
  createPlayer,
  giveCoins,
  grantCard,
  visitor,
  waitForShopWindowMargin,
  setShopSlot,
  type Player,
} from "./supabase";

let owner: Player;
let other: Player;
let publicPlayer: Player;
let cardId: string;
let activeBoosterId: string;
let inactiveBoosterId: string;

beforeAll(async () => {
  [owner, other, publicPlayer] = await Promise.all([
    createPlayer(),
    createPlayer(),
    createPlayer(),
  ]);
  await admin.from("profiles").update({ is_public: false }).eq("id", owner.id);
  await admin.from("profiles").update({ is_public: true }).eq("id", publicPlayer.id);

  cardId = await createCard("common");
  const translation = await admin
    .from("card_translations")
    .insert({ card_id: cardId, locale: "fr", name: "Carte de test", description: "Test" });
  if (translation.error) throw translation.error;
  activeBoosterId = await createBooster({ common: 1 }, 100);
  inactiveBoosterId = await createBooster({ common: 1 }, 100, false);

  // The owner gets a row in every table that belongs to a player.
  await grantCard(owner.id, cardId);
  await giveCoins(owner.id, 1000);
  const { error } = await owner.client.rpc("open_booster_pack", {
    p_booster_id: activeBoosterId,
    p_user_id: owner.id,
  });
  if (error) throw error;

  // ... and an offre boutique, stored by its first read (not split by a window change).
  await waitForShopWindowMargin(30);
  const offer = await owner.client.rpc("get_booster_shop_offer");
  if (offer.error) throw offer.error;

  // ... one emplacement of it opened, so it carries opened_at and draw_id.
  const windowIndex = parseBoosterShopOffer(offer.data).windowIndex;
  await setShopSlot(owner.id, windowIndex, 0, activeBoosterId);
  const slot = await owner.client.rpc("open_booster_shop_slot", {
    p_window_index: windowIndex,
    p_slot_index: 0,
  });
  if (slot.error) throw slot.error;
}, 45_000);

afterAll(cleanup);

async function snapshot(table: string, column: string, value: string): Promise<string> {
  const { data, error } = await admin.from(table).select("*").eq(column, value);
  if (error) throw error;
  return JSON.stringify(data.map((row) => JSON.stringify(row)).sort());
}

async function visibleCount(
  client: SupabaseClient,
  table: string,
  column: string,
  value: string,
): Promise<number> {
  const { data, error } = await client.from(table).select("*").eq(column, value);
  return error ? 0 : data.length;
}

type Row = Record<string, unknown>;
type OwnedTableCase = { table: string; insert: () => Row; update: () => Row };
type GameDataCase = {
  table: string;
  key: string;
  id: () => string;
  insert: () => Row;
  update: Row;
};

describe.each<OwnedTableCase>([
  {
    table: "user_cards",
    insert: () => ({ user_id: owner.id, card_id: cardId, quantity: 99 }),
    update: () => ({ quantity: 99 }),
  },
  {
    table: "user_card_grants",
    insert: () => ({ user_id: owner.id, card_id: cardId, quantity: 99, source: "api" }),
    update: () => ({ quantity: 99 }),
  },
  {
    table: "currency_ledger",
    insert: () => ({ user_id: owner.id, amount: 1_000_000, type: "admin_adjust" }),
    update: () => ({ amount: 1_000_000 }),
  },
  {
    table: "draw_logs",
    insert: () => ({ user_id: owner.id, booster_id: activeBoosterId, results: [], roll_seed: "x" }),
    update: () => ({ results: [] }),
  },
  {
    table: "booster_shop_slots",
    insert: () => ({
      user_id: owner.id,
      window_index: 0,
      slot_index: 0,
      booster_id: activeBoosterId,
    }),
    // Also "un-exhausts" the opened emplacement: a player must not get it back that way.
    update: () => ({ booster_id: inactiveBoosterId, opened_at: null, draw_id: null }),
  },
])("$table: a player's own rows", ({ table, insert, update }) => {
  it("are visible to their owner only", async () => {
    const total = await visibleCount(admin, table, "user_id", owner.id);
    expect(total).toBeGreaterThan(0);

    expect(await visibleCount(owner.client, table, "user_id", owner.id)).toBe(total);
    expect(await visibleCount(other.client, table, "user_id", owner.id)).toBe(0);
    expect(await visibleCount(visitor, table, "user_id", owner.id)).toBe(0);
  });

  it("cannot be added, changed or deleted through the API, even by their owner", async () => {
    const before = await snapshot(table, "user_id", owner.id);

    for (const client of [owner.client, other.client, visitor]) {
      const inserted = await client.from(table).insert(insert());
      expect(inserted.error?.code).toBe("42501");
      await client.from(table).update(update()).eq("user_id", owner.id);
      await client.from(table).delete().eq("user_id", owner.id);
    }

    expect(await snapshot(table, "user_id", owner.id)).toBe(before);
  });
});

describe.each<GameDataCase>([
  {
    table: "cards",
    key: "id",
    id: () => cardId,
    insert: () => ({ slug: `hack-${randomUUID()}`, rarity: "mythic", farm_rate_base: 1000 }),
    update: { farm_rate_base: 1000 },
  },
  {
    table: "card_translations",
    key: "card_id",
    id: () => cardId,
    insert: () => ({ card_id: cardId, locale: "en", name: "Hack", description: "Hack" }),
    update: { name: "Hack" },
  },
  {
    table: "booster_definitions",
    key: "id",
    id: () => activeBoosterId,
    insert: () => ({ slug: `hack-${randomUUID()}`, cost_coins: 1, rarity_weights: { mythic: 1 } }),
    update: { cost_coins: 1 },
  },
  {
    table: "economy_config",
    key: "key",
    id: () => "farm_global_multiplier",
    insert: () => ({ key: `hack-${randomUUID()}`, value: 1000 }),
    update: { value: 1000 },
  },
])("$table: game data", ({ table, key, id, insert, update }) => {
  it("is readable by everyone", async () => {
    expect(await visibleCount(visitor, table, key, id())).toBeGreaterThan(0);
    expect(await visibleCount(owner.client, table, key, id())).toBeGreaterThan(0);
  });

  it("cannot be added, changed or deleted through the API", async () => {
    const before = await snapshot(table, key, id());

    for (const client of [owner.client, visitor]) {
      const inserted = await client.from(table).insert(insert());
      expect(inserted.error?.code).toBe("42501");
      await client.from(table).update(update).eq(key, id());
      await client.from(table).delete().eq(key, id());
    }

    expect(await snapshot(table, key, id())).toBe(before);
  });
});

describe("booster_definitions", () => {
  it("hides inactive boosters from players and visitors", async () => {
    expect(await visibleCount(visitor, "booster_definitions", "id", inactiveBoosterId)).toBe(0);
    expect(await visibleCount(owner.client, "booster_definitions", "id", inactiveBoosterId)).toBe(
      0,
    );
  });
});

describe("profiles", () => {
  it("shows a private profile to its owner only", async () => {
    expect(await visibleCount(owner.client, "profiles", "id", owner.id)).toBe(1);
    expect(await visibleCount(other.client, "profiles", "id", owner.id)).toBe(0);
    expect(await visibleCount(visitor, "profiles", "id", owner.id)).toBe(0);
  });

  it("shows a public profile to everyone", async () => {
    expect(await visibleCount(other.client, "profiles", "id", publicPlayer.id)).toBe(1);
    expect(await visibleCount(visitor, "profiles", "id", publicPlayer.id)).toBe(1);
  });

  it("cannot be edited by anyone but its owner", async () => {
    const before = await snapshot("profiles", "id", publicPlayer.id);

    for (const client of [other.client, visitor]) {
      await client.from("profiles").update({ display_name: "Hack" }).eq("id", publicPlayer.id);
    }

    expect(await snapshot("profiles", "id", publicPlayer.id)).toBe(before);
  });

  it("cannot be created or deleted through the API", async () => {
    const before = await snapshot("profiles", "id", owner.id);

    const inserted = await owner.client.from("profiles").insert({ id: randomUUID() });
    expect(inserted.error?.code).toBe("42501");
    await owner.client.from("profiles").delete().eq("id", owner.id);
    await visitor.from("profiles").delete().eq("id", owner.id);

    expect(await snapshot("profiles", "id", owner.id)).toBe(before);
  });
});

describe("contest_entries (e-mails of the launch contest)", () => {
  const email = `test-${randomUUID()}@example.test`;

  beforeAll(async () => {
    const { error } = await admin.from("contest_entries").insert({ contest_key: "test", email });
    if (error) throw error;
  });

  afterAll(async () => {
    await admin.from("contest_entries").delete().eq("email", email);
  });

  it("cannot be read or written by players or visitors", async () => {
    for (const client of [owner.client, visitor]) {
      const read = await client.from("contest_entries").select("email").eq("email", email);
      expect(read.error?.code).toBe("42501");
      const write = await client
        .from("contest_entries")
        .insert({ contest_key: "test", email: `hack-${randomUUID()}@example.test` });
      expect(write.error?.code).toBe("42501");
    }
  });
});

describe("storage", () => {
  // Smallest valid PNG (1×1 transparent pixel).
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = { contentType: "image/png", upsert: true };
  const uploaded: { bucket: string; path: string }[] = [];

  async function exists(bucket: string, path: string): Promise<boolean> {
    const { data } = await admin.storage.from(bucket).download(path);
    return data !== null;
  }

  afterAll(async () => {
    for (const { bucket, path } of uploaded) {
      await admin.storage.from(bucket).remove([path]);
    }
  });

  describe("card-art (card images)", () => {
    const path = `test/${randomUUID()}.png`;

    beforeAll(async () => {
      const { error } = await admin.storage.from("card-art").upload(path, png, upload);
      if (error) throw error;
      uploaded.push({ bucket: "card-art", path });
    });

    it("is readable by everyone", async () => {
      expect((await visitor.storage.from("card-art").download(path)).error).toBeNull();
    });

    it("cannot be uploaded to, overwritten or deleted by players or visitors", async () => {
      for (const client of [owner.client, visitor]) {
        const newPath = `test/${randomUUID()}.png`;
        const added = await client.storage.from("card-art").upload(newPath, png, upload);
        if (!added.error) uploaded.push({ bucket: "card-art", path: newPath });
        expect(added.error).not.toBeNull();

        const overwritten = await client.storage.from("card-art").upload(path, png, upload);
        expect(overwritten.error).not.toBeNull();

        await client.storage.from("card-art").remove([path]);
      }
      expect(await exists("card-art", path)).toBe(true);
    });
  });

  describe("profile-banners", () => {
    it("lets a player upload in their own folder, readable by everyone", async () => {
      const path = `${owner.id}/banner-test.png`;

      const { error } = await owner.client.storage
        .from("profile-banners")
        .upload(path, png, upload);
      uploaded.push({ bucket: "profile-banners", path });

      expect(error).toBeNull();
      expect((await visitor.storage.from("profile-banners").download(path)).error).toBeNull();
    });

    it("refuses uploads in another player's folder, and from visitors", async () => {
      const intoOther = `${other.id}/banner-test.png`;
      const fromOwner = await owner.client.storage
        .from("profile-banners")
        .upload(intoOther, png, upload);
      if (!fromOwner.error) uploaded.push({ bucket: "profile-banners", path: intoOther });

      const fromVisitor = await visitor.storage
        .from("profile-banners")
        .upload(`${owner.id}/visitor.png`, png, upload);
      if (!fromVisitor.error)
        uploaded.push({ bucket: "profile-banners", path: `${owner.id}/visitor.png` });

      expect(fromOwner.error).not.toBeNull();
      expect(fromVisitor.error).not.toBeNull();
    });

    it("does not let another player or a visitor delete someone's banner", async () => {
      const path = `${owner.id}/keep-test.png`;
      const { error } = await owner.client.storage
        .from("profile-banners")
        .upload(path, png, upload);
      if (error) throw error;
      uploaded.push({ bucket: "profile-banners", path });

      await other.client.storage.from("profile-banners").remove([path]);
      await visitor.storage.from("profile-banners").remove([path]);

      expect(await exists("profile-banners", path)).toBe(true);
    });
  });
});
