/**
 * The settings history and its write function, through the public API (CYR-117).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 *
 * economy_config is global: every test that changes the multiplier puts the original value back.
 * The history rows of the test accounts go away in cleanup().
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  addTeamMember,
  admin,
  cleanup,
  createPlayer,
  deletePlayer,
  economyConfigValue,
  setEconomyConfigValue,
  sql,
  visitor,
  type Player,
} from "./supabase";

afterAll(cleanup);

const KEY = "farm_global_multiplier";

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

async function updatedAt(): Promise<string> {
  const { data, error } = await admin
    .from("economy_config")
    .select("updated_at")
    .eq("key", KEY)
    .single();
  if (error) throw error;
  return data.updated_at;
}

/** The function under test, called as the server does (service role). */
function setConfig(value: number, authorId: string, restoredFrom: number | null = null) {
  return admin.rpc("admin_set_economy_config", {
    p_key: KEY,
    p_value: value,
    p_author_id: authorId,
    p_restored_from: restoredFrom,
  });
}

async function superAdmin(): Promise<Player> {
  const member = await createPlayer({ display_name: "Chef test" });
  await addTeamMember(member.id, "super_admin");
  return member;
}

/** A value different from the current one, to change it. */
const otherThan = (value: number) => (value === 1.5 ? 2 : 1.5);

/** Runs a test body with the multiplier put back afterwards. */
async function restoringMultiplier(body: (original: number) => Promise<void>) {
  const original = await economyConfigValue(KEY);
  try {
    await body(original);
  } finally {
    await setEconomyConfigValue(KEY, original);
  }
}

describe("admin_set_economy_config", () => {
  it("changes the value and adds one history row in the same transaction", async () => {
    await restoringMultiplier(async (m0) => {
      const author = await superAdmin();
      const m1 = otherThan(m0);

      const { data, error } = await setConfig(m1, author.id);

      expect(error).toBeNull();
      expect(await economyConfigValue(KEY)).toBe(m1);
      const rows = await historyOf(author.id);
      expect(rows).toHaveLength(1);
      expect(data).toBe(rows[0].id);
      expect(rows[0]).toMatchObject({
        scope: "economy_config",
        target: KEY,
        field: null,
        old_value: m0,
        new_value: m1,
        author_id: author.id,
        restored_from: null,
      });
      // now() is the transaction's start: both writes share it.
      expect(new Date(await updatedAt()).getTime()).toBe(new Date(rows[0].changed_at).getTime());
    });
  });

  it("writes nothing when the value is the current one", async () => {
    await restoringMultiplier(async (m0) => {
      const author = await superAdmin();
      const before = await updatedAt();

      const { data, error } = await setConfig(m0, author.id);

      expect(error).toBeNull();
      expect(data).toBeNull();
      expect(await historyOf(author.id)).toEqual([]);
      expect(await updatedAt()).toBe(before);
    });
  });

  it("records which row a restore comes from", async () => {
    await restoringMultiplier(async (m0) => {
      const author = await superAdmin();
      const m1 = otherThan(m0);
      const first = await setConfig(m1, author.id);

      const restore = await setConfig(m0, author.id, first.data);

      expect(restore.error).toBeNull();
      const [rowA, rowB] = await historyOf(author.id);
      expect(rowB.id).toBe(restore.data);
      expect(rowB).toMatchObject({
        restored_from: rowA.id,
        old_value: m1,
        new_value: m0,
      });
      expect(await economyConfigValue(KEY)).toBe(m0);
    });
  });

  it("changes nothing when the history row cannot be written", async () => {
    await restoringMultiplier(async (m0) => {
      const unknownAuthor = randomUUID();

      const { error } = await setConfig(otherThan(m0), unknownAuthor);

      expect(error?.code).toBe("23503");
      expect(await economyConfigValue(KEY)).toBe(m0);
      expect(await historyOf(unknownAuthor)).toEqual([]);
    });
  });

  it("keeps a row when its author's account is deleted, with no author", async () => {
    await restoringMultiplier(async (m0) => {
      const author = await superAdmin();
      const { data: id, error } = await setConfig(otherThan(m0), author.id);
      expect(error).toBeNull();

      try {
        const deleted = await deletePlayer(author);

        expect(deleted.error).toBeNull();
        const { data: row, error: readError } = await admin
          .from("admin_setting_changes")
          .select("id, author_id")
          .eq("id", id)
          .maybeSingle();
        expect(readError).toBeNull();
        expect(row).toEqual({ id, author_id: null });
      } finally {
        // No author left for cleanup() to find the row by.
        await admin.from("admin_setting_changes").delete().eq("id", id);
      }
    });
  });

  it("keeps each old value equal to the previous new value when changes arrive at the same moment", async () => {
    await restoringMultiplier(async (m0) => {
      const author = await superAdmin();
      const values = [0.5, 1.25, 2.5, 3, 4, 4.5].filter((value) => value !== m0).slice(0, 5);

      const results = await Promise.all(values.map((value) => setConfig(value, author.id)));

      expect(results.map((result) => result.error)).toEqual(values.map(() => null));
      const rows = await historyOf(author.id);
      expect(rows).toHaveLength(5);
      expect(Number(rows[0].old_value)).toBe(m0);
      for (let index = 1; index < rows.length; index++) {
        expect(rows[index].old_value).toBe(rows[index - 1].new_value);
      }
      expect(await economyConfigValue(KEY)).toBe(Number(rows[4].new_value));
    });
  });
});

describe("admin_setting_changes access", () => {
  // Would catch: a grant or a policy that lets a client read or edit the history.
  it.each([
    ["a visitor", "select"],
    ["a visitor", "insert"],
    ["a visitor", "update"],
    ["a visitor", "delete"],
    ["a signed-in super_admin", "select"],
    ["a signed-in super_admin", "insert"],
    ["a signed-in super_admin", "update"],
    ["a signed-in super_admin", "delete"],
  ] as const)("%s cannot %s", async (who, operation) => {
    await restoringMultiplier(async (m0) => {
      const member = await superAdmin();
      const { data: id, error: arrangeError } = await setConfig(otherThan(m0), member.id);
      expect(arrangeError).toBeNull();
      const client = who === "a visitor" ? visitor : member.client;
      const table = () => client.from("admin_setting_changes");

      const result = await {
        select: () => table().select("id"),
        insert: () =>
          table().insert({
            scope: "economy_config",
            target: KEY,
            old_value: m0,
            new_value: 3,
          }),
        update: () => table().update({ new_value: 3 }).eq("id", id),
        delete: () => table().delete().eq("id", id),
      }[operation]();

      expect(result.error?.code).toBe("42501");
      expect(await historyOf(member.id)).toHaveLength(1);
    });
  });

  it("has row level security on and no policy", () => {
    const [row] = sql<{ rls: boolean; policies: number }>(
      `select c.relrowsecurity as rls,
              (select count(*)::int from pg_policies p
               where p.schemaname = 'public' and p.tablename = 'admin_setting_changes') as policies
       from pg_class c
       where c.oid = 'public.admin_setting_changes'::regclass`,
    );

    expect(row).toEqual({ rls: true, policies: 0 });
  });
});
