/**
 * Who can read and write team roles (team_members) through the public API: nobody but the
 * service role, not even a team member on their own row. Runs against the local Supabase:
 * npm run test:integration (see docs/testing.md).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addTeamMember,
  admin,
  cleanup,
  createPlayer,
  deletePlayer,
  sql,
  visitor,
  type Player,
} from "./supabase";

let player: Player;
let member: Player;

beforeAll(async () => {
  [player, member] = await Promise.all([createPlayer(), createPlayer()]);
  await addTeamMember(member.id, "viewer");
});

afterAll(cleanup);

// The clients only exist after beforeAll, so each row resolves its own lazily.
const actors: { client: () => SupabaseClient }[] = [
  { client: () => visitor },
  { client: () => member.client },
];

describe("team_members through the public API", () => {
  it.each([
    { name: "a visitor cannot read team roles", client: actors[0].client },
    {
      name: "a team member cannot read team roles, not even their own",
      client: actors[1].client,
    },
  ])("$name", async ({ client }) => {
    const read = await client().from("team_members").select("role").eq("user_id", member.id);
    expect(read.error?.code).toBe("42501");
  });

  it.each([
    { name: "a visitor cannot add, change or remove a team role", client: actors[0].client },
    {
      name: "a team member cannot add, change or remove a team role, not even their own",
      client: actors[1].client,
    },
  ])("$name", async ({ client: clientOf }) => {
    const client = clientOf();
    const insert = await client
      .from("team_members")
      .insert({ user_id: player.id, role: "super_admin" });
    expect(insert.error?.code).toBe("42501");
    const update = await client
      .from("team_members")
      .update({ role: "super_admin" })
      .eq("user_id", member.id);
    expect(update.error?.code).toBe("42501");
    const remove = await client.from("team_members").delete().eq("user_id", member.id);
    expect(remove.error?.code).toBe("42501");
  });
});

describe("team_members for the server", () => {
  it("the server can add a team member and read their role", async () => {
    const fresh = await createPlayer();
    const insert = await admin.from("team_members").insert({ user_id: fresh.id, role: "viewer" });
    expect(insert.error).toBeNull();
    const { data, error } = await admin
      .from("team_members")
      .select("role, created_at")
      .eq("user_id", fresh.id)
      .single();
    expect(error).toBeNull();
    expect(data?.role).toBe("viewer");
    expect(data?.created_at).not.toBeNull();
  });

  it.each([
    [
      "a second role for the same account",
      () => ({ user_id: member.id, role: "moderator" }),
      "23505",
    ],
    ["a member without a role", () => ({ user_id: player.id }), "23502"],
    ["an unknown role", () => ({ user_id: player.id, role: "admin" }), "22P02"],
  ])("the server cannot store %s", async (_label, row, code) => {
    const { error } = await admin.from("team_members").insert(row());
    expect(error?.code).toBe(code);
  });
});

describe("team_members storage rules", () => {
  it("team roles are exactly super_admin, moderator and viewer", () => {
    const rows = sql<{ role: string }>(
      "select unnest(enum_range(null::public.team_role))::text as role",
    );
    expect(rows.map((row) => row.role).sort()).toEqual(["moderator", "super_admin", "viewer"]);
  });

  it("row level security is on, with no policy", () => {
    const [table] = sql<{ enabled: boolean }>(
      "select relrowsecurity as enabled from pg_class where oid = 'public.team_members'::regclass",
    );
    expect(table.enabled).toBe(true);
    const [policies] = sql<{ total: number }>(
      "select count(*)::int as total from pg_policies where schemaname = 'public' and tablename = 'team_members'",
    );
    expect(policies.total).toBe(0);
  });

  it("deleting an account removes its team role", async () => {
    const leaving = await createPlayer();
    await addTeamMember(leaving.id, "moderator");
    const { error } = await deletePlayer(leaving);
    expect(error).toBeNull();
    const { data, error: readError } = await admin
      .from("team_members")
      .select("user_id")
      .eq("user_id", leaving.id);
    expect(readError).toBeNull();
    expect(data).toEqual([]);
  });
});
