/**
 * The coin grants of the super administrateur and their write function, through the public API
 * (CYR-118). Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 *
 * The grant rows go away with their target's account, in cleanup().
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  addTeamMember,
  admin,
  balanceOf,
  cleanup,
  coinGrantsBy,
  coinGrantsOf,
  createPlayer,
  deletePlayer,
  ledgerOf,
  sql,
  visitor,
  type Player,
} from "./supabase";

afterAll(cleanup);

/** The function under test, called as the server does (service role). */
function grantCoins(userId: string, amount: number, authorId: string, reason?: string | null) {
  return admin.rpc("admin_grant_coins", {
    p_user_id: userId,
    p_amount: amount,
    p_author_id: authorId,
    ...(reason === undefined ? {} : { p_reason: reason }),
  });
}

async function superAdmin(): Promise<Player> {
  const member = await createPlayer({ display_name: "Chef test" });
  await addTeamMember(member.id, "super_admin");
  return member;
}

describe("admin_grant_coins", () => {
  it("credits the target with an admin_adjust row and keeps the grant, in the same call", async () => {
    const author = await superAdmin();
    const target = await createPlayer();

    const { error } = await grantCoins(target.id, 500, author.id);

    expect(error).toBeNull();
    const grants = await coinGrantsBy(author.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      user_id: target.id,
      amount: 500,
      reason: null,
      author_id: author.id,
    });
    // The ledger row carries neither the author nor the reason: the player reads their rows.
    expect(await ledgerOf(target.id)).toEqual([
      { amount: 500, type: "admin_adjust", reference_id: grants[0].id, metadata: {} },
    ]);
    const { data, error: syncError } = await target.client.rpc("sync_user_economy", {
      p_user_id: target.id,
    });
    expect(syncError).toBeNull();
    expect(Number(data.balance)).toBe(500);
  });

  // Would catch: a call that keeps one of its two rows when the other fails (all or nothing).
  it("writes nothing when the author is unknown", async () => {
    const target = await createPlayer();
    const unknownAuthor = randomUUID();

    const { error } = await grantCoins(target.id, 500, unknownAuthor);

    expect(error?.code).toBe("23503");
    expect(await coinGrantsBy(unknownAuthor)).toEqual([]);
    expect(await ledgerOf(target.id)).toEqual([]);
    expect(await balanceOf(target.id)).toBe(0);
  });

  it("refuses an account that no longer exists as unknown_account, writing nothing", async () => {
    const author = await superAdmin();
    const target = await createPlayer();
    await deletePlayer(target);

    const { error } = await grantCoins(target.id, 500, author.id);

    expect(error?.message).toBe("unknown_account");
    expect(await coinGrantsOf(target.id)).toEqual([]);
    expect(await ledgerOf(target.id)).toEqual([]);
  });

  it("keeps the reason in the grant only, not in the ledger row", async () => {
    const author = await superAdmin();
    const target = await createPlayer();

    const { error } = await grantCoins(target.id, 1000, author.id, "Gagnant du concours");

    expect(error).toBeNull();
    const [grant] = await coinGrantsBy(author.id);
    expect(grant.reason).toBe("Gagnant du concours");
    expect(await ledgerOf(target.id)).toEqual([
      { amount: 1000, type: "admin_adjust", reference_id: grant.id, metadata: {} },
    ]);
  });

  it("deletes the grants of an account with the account", async () => {
    const author = await superAdmin();
    const target = await createPlayer();
    await grantCoins(target.id, 500, author.id);
    expect(await coinGrantsOf(target.id)).toHaveLength(1);

    await deletePlayer(target);

    expect(await coinGrantsOf(target.id)).toEqual([]);
  });

  it("keeps a grant without author when its author's account is deleted", async () => {
    const author = await superAdmin();
    const target = await createPlayer();
    await grantCoins(target.id, 500, author.id);

    await deletePlayer(author);

    const grants = await coinGrantsOf(target.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ user_id: target.id, amount: 500, author_id: null });
  });
});

describe("admin_coin_grants access", () => {
  // Would catch: a grant or a policy that lets a client read or edit the grants.
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
    const member = await superAdmin();
    const target = await createPlayer();
    const { error: arrangeError } = await grantCoins(target.id, 500, member.id);
    expect(arrangeError).toBeNull();
    const [grant] = await coinGrantsBy(member.id);
    const client = who === "a visitor" ? visitor : member.client;
    const table = () => client.from("admin_coin_grants");

    const result = await {
      select: () => table().select("id"),
      insert: () => table().insert({ user_id: target.id, amount: 1, author_id: member.id }),
      update: () => table().update({ amount: 1 }).eq("id", grant.id),
      delete: () => table().delete().eq("id", grant.id),
    }[operation]();

    expect(result.error?.code).toBe("42501");
    expect(await coinGrantsBy(member.id)).toEqual([grant]);
  });

  it("has row level security on and no policy", () => {
    const [row] = sql<{ rls: boolean; policies: number }>(
      `select c.relrowsecurity as rls,
              (select count(*)::int from pg_policies p
               where p.schemaname = 'public' and p.tablename = 'admin_coin_grants') as policies
       from pg_class c
       where c.oid = 'public.admin_coin_grants'::regclass`,
    );

    expect(row).toEqual({ rls: true, policies: 0 });
  });
});
