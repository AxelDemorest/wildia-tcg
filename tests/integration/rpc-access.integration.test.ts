/**
 * Who may call the economy functions through the public API (POST /rest/v1/rpc/...).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
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
  sql,
  visitor,
} from "./supabase";

afterAll(cleanup);

/** Functions in public a role may execute; triggers excluded, the API cannot call them. */
function callableBy(role: "anon" | "authenticated"): string[] {
  return sql<{ proname: string }>(
    `select p.proname from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prorettype <> 'trigger'::regtype
       and has_function_privilege('${role}', p.oid, 'EXECUTE')
     order by 1`,
  ).map((row) => row.proname);
}

describe("function privileges, for every function in public", () => {
  it("no function is callable by a visitor", () => {
    expect(callableBy("anon")).toEqual([]);
  });

  it("players can only call get_booster_shop_offer, open_booster_pack and sync_user_economy", () => {
    expect(callableBy("authenticated")).toEqual([
      "get_booster_shop_offer",
      "open_booster_pack",
      "sync_user_economy",
    ]);
  });

  it("a function added by a future migration is callable by the server only, until granted", () => {
    const [row] = sql<{ grantees: string[] }>(
      `with defaults as (
         select coalesce(
           (select defaclacl from pg_default_acl
            where defaclrole = 'postgres'::regrole and defaclnamespace = 0 and defaclobjtype = 'f'),
           acldefault('f', 'postgres'::regrole)
         ) as acl
         union all
         select defaclacl from pg_default_acl
         where defaclrole = 'postgres'::regrole
           and defaclnamespace = 'public'::regnamespace
           and defaclobjtype = 'f'
       )
       select array_agg(distinct case when a.grantee = 0 then 'public' else a.grantee::regrole::text end) as grantees
       from defaults d, aclexplode(d.acl) a
       where a.privilege_type = 'EXECUTE'`,
    );
    expect([...row.grantees].sort()).toEqual(["postgres", "service_role"]);
  });
});

async function quantityOf(userId: string, cardId: string): Promise<number> {
  const { data, error } = await admin
    .from("user_cards")
    .select("quantity")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (error) throw error;
  return data?.quantity ?? 0;
}

async function drawCount(userId: string): Promise<number> {
  const { count, error } = await admin
    .from("draw_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

describe("grant_card", () => {
  it("cannot be called by a visitor, for anyone", async () => {
    const player = await createPlayer();
    const cardId = await createCard("mythic");

    const { error } = await visitor.rpc("grant_card", {
      p_user_id: player.id,
      p_card_id: cardId,
      p_quantity: 50,
      p_source: "test",
    });

    expect(error?.code).toBe("42501");
    expect(await quantityOf(player.id, cardId)).toBe(0);
  });

  it("cannot be called by a signed-in player, even for themselves", async () => {
    const player = await createPlayer();
    const cardId = await createCard("mythic");

    const { error } = await player.client.rpc("grant_card", {
      p_user_id: player.id,
      p_card_id: cardId,
      p_quantity: 50,
      p_source: "test",
    });

    expect(error?.code).toBe("42501");
    expect(await quantityOf(player.id, cardId)).toBe(0);
  });

  it("still works for the server (service role)", async () => {
    const player = await createPlayer();
    const cardId = await createCard("common");

    const { error } = await admin.rpc("grant_card", {
      p_user_id: player.id,
      p_card_id: cardId,
      p_quantity: 1,
      p_source: "test",
    });

    expect(error).toBeNull();
    expect(await quantityOf(player.id, cardId)).toBe(1);
  });
});

describe("sync_user_economy", () => {
  it("cannot be called by a visitor on a player's account", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);

    const { data, error } = await visitor.rpc("sync_user_economy", { p_user_id: player.id });

    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  it("works for a player on their own account", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);

    const { data, error } = await player.client.rpc("sync_user_economy", {
      p_user_id: player.id,
    });

    expect(error).toBeNull();
    expect(Number(data.balance)).toBe(1000);
  });
});

describe("open_booster_pack", () => {
  it("cannot be called by a visitor to spend a player's coins", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100);

    const { error } = await visitor.rpc("open_booster_pack", {
      p_booster_id: boosterId,
      p_user_id: player.id,
    });

    expect(error?.code).toBe("42501");
    expect(await balanceOf(player.id)).toBe(1000);
    expect(await drawCount(player.id)).toBe(0);
  });

  it("refuses a player opening a booster on someone else's account", async () => {
    const attacker = await createPlayer();
    const victim = await createPlayer();
    await giveCoins(victim.id, 1000);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100);

    const { error } = await attacker.client.rpc("open_booster_pack", {
      p_booster_id: boosterId,
      p_user_id: victim.id,
    });

    expect(error?.message).toBe("forbidden");
    expect(await balanceOf(victim.id)).toBe(1000);
  });

  it("works for a player on their own account", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100);

    const { data, error } = await player.client.rpc("open_booster_pack", {
      p_booster_id: boosterId,
      p_user_id: player.id,
    });

    expect(error).toBeNull();
    expect(data.cards).toHaveLength(5);
    expect(await balanceOf(player.id)).toBe(900);
  });
});

describe("get_booster_shop_offer", () => {
  it("cannot be called by a visitor", async () => {
    const { data, error } = await visitor.rpc("get_booster_shop_offer");

    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  it("refuses a call without a signed-in player, even with the service role", async () => {
    const { error } = await admin.rpc("get_booster_shop_offer");

    expect(error?.message).toBe("not authenticated");
  });
});

describe("internal helpers", () => {
  it.each(["user_currency_balance", "pick_weighted_rarity"])(
    "%s is not callable from the API by visitors or players",
    async (fn) => {
      const player = await createPlayer();
      const args =
        fn === "user_currency_balance" ? { p_user_id: player.id } : { p_weights: { common: 1 } };

      const fromVisitor = await visitor.rpc(fn, args);
      const fromPlayer = await player.client.rpc(fn, args);

      expect(fromVisitor.error?.code).toBe("42501");
      expect(fromPlayer.error?.code).toBe("42501");
    },
  );

  it.each(["private.booster_shop_window()", "private.pick_shop_booster()"])(
    "%s is executable by neither anon nor authenticated",
    (fn) => {
      const [row] = sql<{ anon: boolean; authenticated: boolean }>(
        `select has_function_privilege('anon', '${fn}', 'EXECUTE') as anon,
                has_function_privilege('authenticated', '${fn}', 'EXECUTE') as authenticated`,
      );

      expect(row).toEqual({ anon: false, authenticated: false });
    },
  );
});
