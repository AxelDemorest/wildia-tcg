/**
 * The booster settings write function and its history, through the public API (CYR-118).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 *
 * Each test changes a booster created for it (removed by cleanup(), like the history rows of the
 * test accounts), never a real one.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  addTeamMember,
  admin,
  boosterBySlug,
  boosterSlugOf,
  cleanup,
  createBooster,
  createPlayer,
  setBoosterDefinition,
  sql,
  withOnlyShopBooster,
  type Player,
} from "./supabase";

afterAll(cleanup);

type HistoryRow = {
  id: number;
  scope: string;
  target: string;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  author_id: string | null;
  changed_at: string;
  restored_from: number | null;
};

/** The history rows an author wrote, oldest first. */
async function historyOf(authorId: string): Promise<HistoryRow[]> {
  const { data, error } = await admin
    .from("admin_setting_changes")
    .select("*")
    .eq("author_id", authorId)
    .order("id");
  if (error) throw error;
  return data as HistoryRow[];
}

async function updatedAt(slug: string): Promise<string> {
  const { data, error } = await admin
    .from("booster_definitions")
    .select("updated_at")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data.updated_at;
}

/** The function under test, called as the server does (service role). */
function setBooster(
  slug: string,
  changes: Record<string, unknown>,
  authorId: string,
  restoredFrom: number | null = null,
) {
  return admin.rpc("admin_set_booster_definition", {
    p_slug: slug,
    p_changes: changes,
    p_author_id: authorId,
    p_restored_from: restoredFrom,
  });
}

async function superAdmin(): Promise<Player> {
  const member = await createPlayer({ display_name: "Chef test" });
  await addTeamMember(member.id, "super_admin");
  return member;
}

/** A booster created for the test, at 100 coins, and its slug. */
async function testBooster(): Promise<string> {
  return boosterSlugOf(await createBooster({ common: 1 }, 100));
}

describe("admin_set_booster_definition", () => {
  it("changes the price and adds one history row in the same transaction", async () => {
    const slug = await testBooster();
    const author = await superAdmin();

    const { data, error } = await setBooster(slug, { cost_coins: 150 }, author.id);

    expect(error).toBeNull();
    expect((await boosterBySlug(slug)).costCoins).toBe(150);
    const rows = await historyOf(author.id);
    expect(rows).toHaveLength(1);
    expect(data).toBe(rows[0].id);
    expect(rows[0]).toMatchObject({
      scope: "booster_definition",
      target: slug,
      field: "cost_coins",
      old_value: 100,
      new_value: 150,
      author_id: author.id,
      restored_from: null,
    });
    // now() is the transaction's start: both writes share it.
    expect(new Date(await updatedAt(slug)).getTime()).toBe(new Date(rows[0].changed_at).getTime());
  });

  it("changes nothing when the history row cannot be written", async () => {
    const slug = await testBooster();
    const unknownAuthor = randomUUID();

    const { error } = await setBooster(slug, { cost_coins: 150 }, unknownAuthor);

    expect(error?.code).toBe("23503");
    expect((await boosterBySlug(slug)).costCoins).toBe(100);
    expect(await historyOf(unknownAuthor)).toEqual([]);
  });

  it("records which row a restore comes from and puts the value back", async () => {
    const slug = await testBooster();
    const author = await superAdmin();
    const first = await setBooster(slug, { cost_coins: 150 }, author.id);
    expect(first.error).toBeNull();

    const restore = await setBooster(slug, { cost_coins: 100 }, author.id, first.data);

    expect(restore.error).toBeNull();
    const [rowA, rowB] = await historyOf(author.id);
    expect(rowB.id).toBe(restore.data);
    expect(rowB).toMatchObject({
      scope: "booster_definition",
      target: slug,
      field: "cost_coins",
      restored_from: rowA.id,
      old_value: 150,
      new_value: 100,
    });
    expect((await boosterBySlug(slug)).costCoins).toBe(100);
  });
});

/** The old and new values of an author's history rows as jsonb writes them, oldest first. */
function jsonTextOf(authorId: string): { field: string; old_value: string; new_value: string }[] {
  return sql(
    `select field, old_value::text as old_value, new_value::text as new_value
     from public.admin_setting_changes where author_id = '${authorId}' order by id`,
  );
}

describe("admin_set_booster_definition, every value of a card", () => {
  it("writes whole numbers to the history, not the column's padded numerics", async () => {
    const slug = await testBooster();
    const author = await superAdmin();

    const { error } = await setBooster(slug, { cost_coins: 150 }, author.id);

    expect(error).toBeNull();
    expect(jsonTextOf(author.id)).toEqual([
      { field: "cost_coins", old_value: "100", new_value: "150" },
    ]);
  });

  it("applies every value of a whole card, with one history row per changed value", async () => {
    // Inactive, at weight 70, with no mythic chance: the card turns it on at weight 20.
    const slug = await boosterSlugOf(
      await createBooster({ common: 55, rare: 12 }, 100, false, 5, 70),
    );
    const author = await superAdmin();

    const { error } = await setBooster(
      slug,
      {
        cost_coins: 100,
        slots: 6,
        shop_weight: 20,
        is_active: true,
        rarity_weights: { common: 55, uncommon: 0, rare: 20, epic: 0, legendary: 0, mythic: 7 },
      },
      author.id,
    );

    expect(error).toBeNull();
    const booster = await boosterBySlug(slug);
    expect(booster).toMatchObject({ costCoins: 100, slots: 6, shopWeight: 20, isActive: true });
    expect(booster.rarityWeights).toMatchObject({ common: 55, rare: 20, mythic: 7 });
    expect(Object.values(booster.rarityWeights).every((chance) => typeof chance === "number")).toBe(
      true,
    );
    const rows = await historyOf(author.id);
    expect(rows.map((row) => [row.field, row.old_value, row.new_value])).toEqual([
      ["slots", 5, 6],
      ["shop_weight", 70, 20],
      ["is_active", false, true],
      ["rarity_weights.rare", 12, 20],
      ["rarity_weights.mythic", 0, 7],
    ]);
    expect(rows.every((row) => row.scope === "booster_definition" && row.target === slug)).toBe(
      true,
    );
    expect(new Set(rows.map((row) => row.changed_at)).size).toBe(1);
  });

  it("writes the shop weight to the history as a whole number, not the column's padded numeric", async () => {
    const slug = await boosterSlugOf(await createBooster({ common: 55 }, 100, true, 5, 70));
    const author = await superAdmin();

    const { error } = await setBooster(slug, { shop_weight: 20 }, author.id);

    expect(error).toBeNull();
    expect(jsonTextOf(author.id)).toEqual([
      { field: "shop_weight", old_value: "70", new_value: "20" },
    ]);
  });

  it("writes nothing for the same values, a mythic chance of 0 included on a booster without one", async () => {
    const slug = await boosterSlugOf(
      await createBooster({ common: 55, rare: 12 }, 100, true, 5, 70),
    );
    const author = await superAdmin();
    const before = await updatedAt(slug);

    const { data, error } = await setBooster(
      slug,
      {
        cost_coins: 100,
        slots: 5,
        shop_weight: 70,
        is_active: true,
        rarity_weights: { common: 55, uncommon: 0, rare: 12, epic: 0, legendary: 0, mythic: 0 },
      },
      author.id,
    );

    expect(error).toBeNull();
    expect(data).toBeNull();
    expect(await historyOf(author.id)).toEqual([]);
    expect(await updatedAt(slug)).toBe(before);
  });

  it("leaves the other chances as they are when only the Rare chance changes", async () => {
    const slug = await boosterSlugOf(await createBooster({ common: 55, rare: 12 }, 100));
    const author = await superAdmin();

    const { error } = await setBooster(slug, { rarity_weights: { rare: 20 } }, author.id);

    expect(error).toBeNull();
    expect((await boosterBySlug(slug)).rarityWeights).toEqual({ common: 55, rare: 20 });
    const rows = await historyOf(author.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ field: "rarity_weights.rare", old_value: 12, new_value: 20 });
  });
});

describe("admin_set_booster_definition, the rules", () => {
  it.each([
    ["deactivating it", { is_active: false }],
    ["setting its shop weight to 0", { shop_weight: 0 }],
  ])(
    "refuses %s when it is the only booster available, writing nothing",
    async (_name, changes) => {
      const slug = await testBooster();
      const author = await superAdmin();

      await withOnlyShopBooster(slug, async () => {
        const { error } = await setBooster(slug, changes, author.id);

        expect(error?.message).toBe("no_available_booster");
      });

      expect(await boosterBySlug(slug)).toMatchObject({ isActive: true, shopWeight: 1 });
      expect(await historyOf(author.id)).toEqual([]);
    },
  );

  it.each([
    ["deactivating it", { is_active: false }],
    ["setting its shop weight to 0", { shop_weight: 0 }],
  ])("allows %s when another booster is available", async (_name, changes) => {
    const slug = await testBooster();
    const other = await testBooster();
    const author = await superAdmin();

    await withOnlyShopBooster(slug, async () => {
      // Zeroed with the others by the arrangement: available again.
      await setBoosterDefinition(other, { shopWeight: 1 });

      const { error } = await setBooster(slug, changes, author.id);

      expect(error).toBeNull();
    });

    expect(await historyOf(author.id)).toHaveLength(1);
  });

  it("lets only one of two simultaneous deactivations through when two boosters are available", async () => {
    const first = await testBooster();
    const second = await testBooster();
    const author = await superAdmin();

    await withOnlyShopBooster(first, async () => {
      await setBoosterDefinition(second, { shopWeight: 1 });
      // A race can pass by luck: try it several times, from two available boosters each time.
      for (let attempt = 0; attempt < 4; attempt++) {
        await setBoosterDefinition(first, { isActive: true });
        await setBoosterDefinition(second, { isActive: true });

        const results = await Promise.all([
          setBooster(first, { is_active: false }, author.id),
          setBooster(second, { is_active: false }, author.id),
        ]);

        expect(results.map((result) => result.error?.message).sort()).toEqual([
          "no_available_booster",
          undefined,
        ]);
        const active = [await boosterBySlug(first), await boosterBySlug(second)].filter(
          (booster) => booster.isActive,
        );
        expect(active).toHaveLength(1);
      }
    });
  });

  it("chains five simultaneous price changes: each Avant is the previous Après", async () => {
    const slug = await testBooster();
    const author = await superAdmin();

    const results = await Promise.all(
      [101, 102, 103, 104, 105].map((price) => setBooster(slug, { cost_coins: price }, author.id)),
    );

    expect(results.map((result) => result.error)).toEqual([null, null, null, null, null]);
    const rows = await historyOf(author.id);
    expect(rows).toHaveLength(5);
    expect(rows[0].old_value).toBe(100);
    for (let i = 1; i < rows.length; i++) expect(rows[i].old_value).toBe(rows[i - 1].new_value);
    expect((await boosterBySlug(slug)).costCoins).toBe(rows[4].new_value);
  });

  it("refuses to put the last positive chance to 0 through a single rarity, writing nothing", async () => {
    const slug = await boosterSlugOf(await createBooster({ common: 5 }));
    const author = await superAdmin();

    const { error } = await setBooster(slug, { rarity_weights: { common: 0 } }, author.id);

    expect(error?.message).toBe("no_positive_chance");
    expect((await boosterBySlug(slug)).rarityWeights).toEqual({ common: 5 });
    expect(await historyOf(author.id)).toEqual([]);
  });

  it("refuses an unknown slug, writing no history row", async () => {
    const author = await superAdmin();

    const { error } = await setBooster(`unknown-${randomUUID()}`, { cost_coins: 150 }, author.id);

    expect(error?.message).toBe("unknown_booster");
    expect(await historyOf(author.id)).toEqual([]);
  });
});
