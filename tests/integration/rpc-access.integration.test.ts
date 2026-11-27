/**
 * Who may call the economy functions through the public API (POST /rest/v1/rpc/...).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  addTeamMember,
  admin,
  balanceOf,
  cleanup,
  createBooster,
  createCard,
  createPlayer,
  economyConfigValue,
  giveCoins,
  setEconomyConfigValue,
  setShopSlot,
  shopSlotExhaustionOf,
  shopWindowNow,
  sql,
  visitor,
  waitForShopWindowMargin,
} from "./supabase";
import { parseBoosterShopOffer } from "@/lib/boosters/shop";

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

  it("players can only call get_booster_shop_offer, open_booster_shop_slot and sync_user_economy", () => {
    expect(callableBy("authenticated")).toEqual([
      "get_booster_shop_offer",
      "open_booster_shop_slot",
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

describe("open_booster_shop_slot", () => {
  // Would catch: a grant to anon, or a function that debits before checking the caller.
  it("cannot be called by a visitor, and debits nothing", async () => {
    const player = await createPlayer();
    await giveCoins(player.id, 1000);
    const windowIndex = shopWindowNow();

    const { error } = await visitor.rpc("open_booster_shop_slot", {
      p_window_index: windowIndex,
      p_slot_index: 0,
    });

    expect(error?.code).toBe("42501");
    expect(await balanceOf(player.id)).toBe(1000);
  });

  // Would catch: falling back to a user id from the arguments or a null uid reaching the opening.
  it("refuses a call without a signed-in player, even with the service role", async () => {
    const { error } = await admin.rpc("open_booster_shop_slot", {
      p_window_index: shopWindowNow(),
      p_slot_index: 0,
    });

    expect(error?.message).toBe("not authenticated");
  });

  // Would catch: reading the emplacement by window and index only, without the caller's user_id.
  it("only reaches the caller's own offre: a player without one cannot open another player's emplacement", async () => {
    await waitForShopWindowMargin(30);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const owner = await createPlayer();
    const caller = await createPlayer();
    await giveCoins(owner.id, 1000);
    await giveCoins(caller.id, 1000);
    const { data, error } = await owner.client.rpc("get_booster_shop_offer");
    if (error) throw error;
    const windowIndex = parseBoosterShopOffer(data).windowIndex;
    await setShopSlot(owner.id, windowIndex, 0, boosterId);

    const attempt = await caller.client.rpc("open_booster_shop_slot", {
      p_window_index: windowIndex,
      p_slot_index: 0,
    });

    expect(attempt.error?.message).toBe("slot_not_found");
    expect(await balanceOf(caller.id)).toBe(1000);
    expect(await balanceOf(owner.id)).toBe(1000);
    const slots = await shopSlotExhaustionOf(owner.id, windowIndex);
    expect(slots.every((slot) => slot.opened_at === null && slot.draw_id === null)).toBe(true);
  }, 45_000);
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

  it.each([
    "private.booster_shop_window()",
    "private.pick_shop_booster()",
    "private.open_booster_for(uuid, uuid)",
    "private.guard_provider_identity()",
  ])("%s is executable by neither anon nor authenticated", (fn) => {
    const [row] = sql<{ anon: boolean; authenticated: boolean }>(
      `select has_function_privilege('anon', '${fn}', 'EXECUTE') as anon,
                has_function_privilege('authenticated', '${fn}', 'EXECUTE') as authenticated`,
    );

    expect(row).toEqual({ anon: false, authenticated: false });
  });
});

describe("admin_list_accounts", () => {
  // Would catch: a grant to anon, which would hand every e-mail to the internet.
  it("cannot be called by a visitor", async () => {
    const { data, error } = await visitor.rpc("admin_list_accounts");

    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  // Would catch: a grant to authenticated: even a super_admin only reaches the registry through the server.
  it("cannot be called by a signed-in super_admin with their own client", async () => {
    const member = await createPlayer();
    await addTeamMember(member.id, "super_admin");

    const { data, error } = await member.client.rpc("admin_list_accounts");

    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });

  it("still works for the server (service role)", async () => {
    const { data, error } = await admin.rpc("admin_list_accounts");

    expect(error).toBeNull();
    expect(typeof data.total).toBe("number");
    expect(Array.isArray(data.accounts)).toBe(true);
  });
});

describe("admin_set_economy_config", () => {
  const args = (authorId: string) => ({
    p_key: "farm_global_multiplier",
    p_value: 4.5,
    p_author_id: authorId,
    p_restored_from: null,
  });

  // Would catch: a grant to anon, which would let the internet set the farm multiplier.
  it("cannot be called by a visitor, and changes nothing", async () => {
    const member = await createPlayer();
    await addTeamMember(member.id, "super_admin");
    const before = await economyConfigValue("farm_global_multiplier");

    try {
      const { data, error } = await visitor.rpc("admin_set_economy_config", args(member.id));

      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
      expect(await economyConfigValue("farm_global_multiplier")).toBe(before);
    } finally {
      await setEconomyConfigValue("farm_global_multiplier", before);
    }
  });

  // Would catch: a grant to authenticated: even a super_admin only changes it through the server.
  it("cannot be called by a signed-in super_admin with their own client, and changes nothing", async () => {
    const member = await createPlayer();
    await addTeamMember(member.id, "super_admin");
    const before = await economyConfigValue("farm_global_multiplier");

    try {
      const { data, error } = await member.client.rpc("admin_set_economy_config", args(member.id));

      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
      expect(await economyConfigValue("farm_global_multiplier")).toBe(before);
    } finally {
      await setEconomyConfigValue("farm_global_multiplier", before);
    }
  });
});
