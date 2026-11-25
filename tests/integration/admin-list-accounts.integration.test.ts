/**
 * admin_list_accounts: the registry's SQL function, called as the server does (service role).
 * Runs against the local Supabase: npm run test:integration (see docs/testing.md).
 *
 * The local database holds other accounts, so every test searches a unique token that only its
 * own accounts carry in their display name.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { parseBoosterShopOffer } from "@/lib/boosters/shop";
import {
  admin,
  balanceOf,
  cleanup,
  createAccountWithoutSignIn,
  createBooster,
  createCard,
  createPlayer,
  giveCoins,
  ledgerOf,
  setShopSlot,
  waitForShopWindowMargin,
} from "./supabase";

afterAll(cleanup);

type AccountRow = {
  id: string;
  display_name: string | null;
  email: string;
  signed_up_at: string;
  last_sign_in_at: string | null;
  locale: string;
  is_public: boolean;
  /** Sum of the account's currency_ledger; numeric in SQL, so it may come as a string. */
  balance: number | string;
};

async function list(
  args: Record<string, unknown>,
): Promise<{ total: number; accounts: AccountRow[] }> {
  const { data, error } = await admin.rpc("admin_list_accounts", args);
  if (error) throw error;
  return data;
}

const tokenOf = () => randomUUID().replaceAll("-", "").slice(0, 12);

describe("admin_list_accounts", () => {
  it("returns an account's id, name, e-mail, sign-up and last sign-in dates, locale and profile visibility", async () => {
    const token = tokenOf();
    const player = await createPlayer({ display_name: `Fiche ${token}`, locale: "en" });
    const { error } = await admin.from("profiles").update({ is_public: false }).eq("id", player.id);
    if (error) throw error;
    const { data: profile } = await admin
      .from("profiles")
      .select("created_at")
      .eq("id", player.id)
      .single();
    const { data: auth } = await admin.auth.admin.getUserById(player.id);

    const result = await list({ p_search: token });

    expect(result.total).toBe(1);
    const [account] = result.accounts;
    expect(account.id).toBe(player.id);
    expect(account.display_name).toBe(`Fiche ${token}`);
    expect(account.email).toBe(player.email);
    expect(new Date(account.signed_up_at).getTime()).toBe(new Date(profile!.created_at).getTime());
    expect(account.last_sign_in_at).not.toBeNull();
    expect(new Date(account.last_sign_in_at!).getTime()).toBe(
      new Date(auth.user!.last_sign_in_at!).getTime(),
    );
    expect(account.locale).toBe("en");
    expect(account.is_public).toBe(false);
  });

  it("lists newest first, one page at a time, with the total of the search on every page", async () => {
    const token = tokenOf();
    const first = await createAccountWithoutSignIn({ display_name: `Ordre ${token} 1` });
    const second = await createAccountWithoutSignIn({ display_name: `Ordre ${token} 2` });
    const third = await createAccountWithoutSignIn({ display_name: `Ordre ${token} 3` });

    const page1 = await list({ p_search: token, p_limit: 2, p_offset: 0 });
    const page2 = await list({ p_search: token, p_limit: 2, p_offset: 2 });
    const past = await list({ p_search: token, p_limit: 2, p_offset: 4 });

    expect(page1.accounts.map((a) => a.id)).toEqual([third.id, second.id]);
    expect(page2.accounts.map((a) => a.id)).toEqual([first.id]);
    expect(past.accounts).toEqual([]);
    expect([page1.total, page2.total, past.total]).toEqual([3, 3, 3]);
  });

  it("finds a display name whatever the case of the search", async () => {
    const token = tokenOf();
    const account = await createAccountWithoutSignIn({ display_name: `Camille${token}` });

    const lower = await list({ p_search: `camille${token}` });
    const upper = await list({ p_search: `CAMILLE${token}` });

    expect(lower.accounts.map((a) => a.id)).toEqual([account.id]);
    expect(upper.accounts.map((a) => a.id)).toEqual([account.id]);
  });

  it("matches an e-mail only when asked to", async () => {
    const token = tokenOf();
    const account = await createAccountWithoutSignIn({ display_name: `Courrier ${token}` });
    const emailPart = account.email.split("@")[0];

    const asked = await list({ p_search: emailPart, p_search_email: true });
    const refused = await list({ p_search: emailPart, p_search_email: false });
    const omitted = await list({ p_search: emailPart });

    expect(asked.accounts.map((a) => a.id)).toEqual([account.id]);
    expect(refused).toEqual({ total: 0, accounts: [] });
    expect(omitted).toEqual({ total: 0, accounts: [] });
  });

  // Would catch: passing the search straight to ilike, where these characters are patterns.
  it.each([
    { name: "%", wanted: "50%off", other: "50xoff" },
    { name: "_", wanted: "a_b", other: "axb" },
    { name: "\\", wanted: "a\\b", other: "ab" },
  ])("treats $name in the search as the character itself", async ({ wanted, other }) => {
    const token = tokenOf();
    const literal = await createAccountWithoutSignIn({ display_name: `${token}${wanted}` });
    await createAccountWithoutSignIn({ display_name: `${token}${other}` });

    const result = await list({ p_search: `${token}${wanted}` });

    expect(result.accounts.map((a) => a.id)).toEqual([literal.id]);
    expect(result.total).toBe(1);
  });
});

// CYR-118: the registry's balance column, the sum of the account's coin ledger.
describe("admin_list_accounts balance", () => {
  it("gives 0 to an account with no coin movement", async () => {
    const token = tokenOf();
    await createAccountWithoutSignIn({ display_name: `Vide ${token}` });

    const result = await list({ p_search: token });

    expect(result.accounts).toHaveLength(1);
    // The raw value, not Number(): a missing balance (null) must not pass as 0.
    expect(result.accounts[0].balance).toBe(0);
  });

  it("counts an admin_adjust row, and keeps each account's balance apart", async () => {
    const token = tokenOf();
    const rich = await createAccountWithoutSignIn({ display_name: `Riche ${token}` });
    const poor = await createAccountWithoutSignIn({ display_name: `Pauvre ${token}` });
    await giveCoins(rich.id, 1250);
    await giveCoins(rich.id, -50);
    await giveCoins(poor.id, 7);

    const result = await list({ p_search: token });

    const balances = Object.fromEntries(result.accounts.map((a) => [a.id, Number(a.balance)]));
    expect(balances).toEqual({ [rich.id]: 1200, [poor.id]: 7 });
  });

  it("counts a booster purchase as a debit", async () => {
    await waitForShopWindowMargin(30);
    const token = tokenOf();
    const player = await createPlayer({ display_name: `Acheteur ${token}` });
    await giveCoins(player.id, 1000);
    await createCard("common");
    const boosterId = await createBooster({ common: 1 }, 100, true, 5, 0);
    const { data: offer, error } = await player.client.rpc("get_booster_shop_offer");
    if (error) throw error;
    const { windowIndex } = parseBoosterShopOffer(offer);
    await setShopSlot(player.id, windowIndex, 0, boosterId);
    const opened = await player.client.rpc("open_booster_shop_slot", {
      p_window_index: windowIndex,
      p_slot_index: 0,
    });
    expect(opened.error).toBeNull();
    expect(await ledgerOf(player.id, "booster_purchase")).toHaveLength(1);

    const result = await list({ p_search: token });

    expect(result.accounts).toHaveLength(1);
    expect(await balanceOf(player.id)).toBe(900);
    expect(Number(result.accounts[0].balance)).toBe(900);
  });

  it("writes no ledger row and leaves last_economy_sync_at alone", async () => {
    const token = tokenOf();
    const player = await createPlayer({ display_name: `Lecture ${token}` });
    await giveCoins(player.id, 300);
    // A date far in the past: a call that synced the economy would move it to now.
    const past = "2000-01-01T00:00:00Z";
    const { error } = await admin
      .from("profiles")
      .update({ last_economy_sync_at: past })
      .eq("id", player.id);
    if (error) throw error;
    const ledgerBefore = await ledgerOf(player.id);

    const result = await list({ p_search: token });

    expect(Number(result.accounts[0].balance)).toBe(300);
    expect(await ledgerOf(player.id)).toEqual(ledgerBefore);
    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("last_economy_sync_at")
      .eq("id", player.id)
      .single();
    if (readError) throw readError;
    expect(new Date(profile.last_economy_sync_at).getTime()).toBe(new Date(past).getTime());
  });
});
