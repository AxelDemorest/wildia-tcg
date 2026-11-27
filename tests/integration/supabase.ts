/**
 * Shared setup for integration tests against the local Supabase.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
 * from the environment, or from .env.local when they are not set. Any URL other than a local
 * one stops the run: these tests create and delete users.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante pour les tests d'intégration : ${name}`);
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(
    `Les tests d'intégration ne tournent que sur un Supabase local (npx supabase start), pas sur ${url}.`,
  );
}
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service role client: bypasses RLS, used to arrange and inspect state. */
export const admin = createClient(url, serviceRoleKey, options);

/** Anyone on the internet: the public anon key, nobody signed in. */
export const visitor = createClient(url, anonKey, options);

/**
 * Runs one SQL statement on the local database (supabase db query --local) and returns its
 * rows, for what the Data API cannot do: reading the Postgres catalog, or using the
 * database's own clock. To change rows, wrap the change in a CTE that the statement selects.
 */
export function sql<Row = Record<string, unknown>>(statement: string): Row[] {
  const output = execFileSync(
    "npx",
    ["supabase", "db", "query", "--local", "-o", "json", statement],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  // A plain array of rows, or { rows, boundary, warning } when the CLI detects it runs under
  // an AI coding agent (it then marks the rows as untrusted data).
  const parsed = JSON.parse(output) as Row[] | { rows: Row[] };
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

export type Player = { id: string; email: string; password: string; client: SupabaseClient };

const createdUsers: string[] = [];
const createdCards: string[] = [];
const createdBoosters: string[] = [];

/**
 * Creates a confirmed user and returns a client signed in as that user, like the app's.
 * `metadata` is what a client may send at signup (raw_user_meta_data), e.g. display_name.
 * The e-mail's name part is 41 characters long, one more than a display name allows.
 */
export async function createPlayer(metadata?: Record<string, unknown>): Promise<Player> {
  const email = `test-${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);

  const client = createClient(url, anonKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, password, client };
}

/**
 * Creates an account the way Supabase Auth does for a new OAuth sign-in: the `auth.users` row
 * is inserted with its provider already in `raw_app_meta_data` (the admin API of `createPlayer`
 * inserts with provider `email` and merges the app metadata afterwards), with the matching
 * `auth.identities` row. `claims` is what the provider returned (raw_user_meta_data).
 * Returns the id and e-mail; the account is deleted by `cleanup`.
 */
export function createProviderAccount(
  provider: "google" | "discord",
  claims: Record<string, unknown>,
): { id: string; email: string } {
  const id = randomUUID();
  const email = `test-${randomUUID()}@example.test`;
  const literal = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const userMetadata = { email, email_verified: true, provider_id: id, sub: id, ...claims };
  // The id is tracked first: a failure halfway must not leave an account behind.
  createdUsers.push(id);
  sql(
    `with new_user as (
       insert into auth.users (
         instance_id, id, aud, role, email, email_confirmed_at,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         confirmation_token, recovery_token, email_change_token_new, email_change
       ) values (
         '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated',
         '${email}', now(),
         ${literal({ provider, providers: [provider] })}, ${literal(userMetadata)}, now(), now(),
         '', '', '', ''
       ) returning id
     ), new_identity as (
       insert into auth.identities (
         id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
       ) values (
         gen_random_uuid(), '${id}', '${id}', ${literal(userMetadata)}, '${provider}',
         now(), now(), now()
       ) returning id
     )
     select (select count(*) from new_user)::int as users,
            (select count(*) from new_identity)::int as identities`,
  );
  return { id, email };
}

/**
 * Creates a confirmed account that never signed in (`last_sign_in_at` null), like a sign-up
 * whose owner never came back. `metadata` is the sign-up metadata, e.g. display_name or locale.
 * Returns the id, e-mail and password, without a client.
 */
export async function createAccountWithoutSignIn(
  metadata?: Record<string, unknown>,
): Promise<{ id: string; email: string; password: string }> {
  const email = `test-${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

/**
 * Creates `count` accounts that never signed in, one after the other so each is newer than the
 * last. `metadataFor` gives the sign-up metadata of the account at that index, from 0.
 */
export async function createAccountsWithoutSignIn(
  count: number,
  metadataFor: (index: number) => Record<string, unknown>,
): Promise<{ id: string; email: string; password: string }[]> {
  const accounts = [];
  for (let index = 0; index < count; index++) {
    accounts.push(await createAccountWithoutSignIn(metadataFor(index)));
  }
  return accounts;
}

/** Tracks a user created another way (e.g. through the signup page) so cleanup deletes it. */
export async function adoptUserByEmail(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`Aucun compte pour ${email}`);
  createdUsers.push(user.id);
  return user.id;
}

/** Deletes a player's account now, as the dashboard or an account deletion would. */
export async function deletePlayer(player: Player) {
  const result = await admin.auth.admin.deleteUser(player.id);
  if (!result.error) createdUsers.splice(createdUsers.indexOf(player.id), 1);
  return result;
}

/** Gives an account a team role (service role, since no client may write team_members). */
export async function addTeamMember(
  userId: string,
  role: "super_admin" | "moderator" | "viewer",
): Promise<void> {
  const { error } = await admin.from("team_members").insert({ user_id: userId, role });
  if (error) throw error;
}

/** Adds a throwaway card, so tests do not depend on the local catalogue. */
export async function createCard(rarity: string, farmRateBase = 0): Promise<string> {
  const { data, error } = await admin
    .from("cards")
    .insert({ slug: `test-${randomUUID()}`, rarity, farm_rate_base: farmRateBase })
    .select("id")
    .single();
  if (error) throw error;
  createdCards.push(data.id);
  return data.id;
}

/** Adds a throwaway card the app can display: with French and English names. */
export async function createCatalogCard(rarity: string, name: string): Promise<string> {
  const cardId = await createCard(rarity);
  const { error } = await admin.from("card_translations").insert([
    { card_id: cardId, locale: "fr", name, description: "Carte créée par un test." },
    { card_id: cardId, locale: "en", name, description: "Card created by a test." },
  ]);
  if (error) throw error;
  return cardId;
}

/** Adds a booster that only draws the given rarities. */
export async function createBooster(
  rarityWeights: Record<string, number>,
  costCoins = 100,
  isActive = true,
  slots = 5,
  shopWeight?: number,
): Promise<string> {
  const { data, error } = await admin
    .from("booster_definitions")
    .insert({
      slug: `test-${randomUUID()}`,
      cost_coins: costCoins,
      rarity_weights: rarityWeights,
      is_active: isActive,
      slots,
      // Omitted: the database default (1), so the booster is offered by the boutique.
      ...(shopWeight === undefined ? {} : { shop_weight: shopWeight }),
    })
    .select("id")
    .single();
  if (error) throw error;
  createdBoosters.push(data.id);
  return data.id;
}

/** The current fenêtre boutique index, on the database's clock (180 s windows). */
export function shopWindowNow(): number {
  const [row] = sql<{ window_index: number }>(
    "select floor(extract(epoch from now()) / 180)::int as window_index",
  );
  return row.window_index;
}

/** Seconds left in the current fenêtre boutique, on the database's clock (180 s windows). */
export function shopWindowRemainingSeconds(): number {
  const [row] = sql<{ remaining: number }>(
    "select (180 - mod(extract(epoch from now())::numeric, 180))::float8 as remaining",
  );
  return row.remaining;
}

/**
 * The end of the current fenêtre boutique, as a timestamp on this process's clock. Reading the
 * remaining seconds and adding them to the call's start would be biased: `sql` spawns the Supabase
 * CLI, which takes 0.5 to 1 s between the call and the database's `now()`. The reading is dated at
 * the middle of the call instead, and converted once, so the database and Node clocks may differ.
 * Callers get the remaining seconds at any later moment with `(end - Date.now()) / 1000`.
 */
export function shopWindowEndMs(): number {
  const startedAtMs = Date.now();
  const remaining = shopWindowRemainingSeconds();
  const midCallMs = (startedAtMs + Date.now()) / 2;
  return midCallMs + remaining * 1000;
}

/**
 * Waits for the next fenêtre boutique when fewer than `seconds` remain in the current one, so
 * a test comparing two reads is not split by a window change. The default of 30 s leaves a slow,
 * cold run (fresh CI, right after `npm ci`) room to finish a test before the window closes.
 */
export async function waitForShopWindowMargin(seconds = 30): Promise<void> {
  const remaining = shopWindowRemainingSeconds();
  if (remaining < seconds) {
    await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
  }
}

/** Sets the number of emplacements of an offre boutique (global config: restore it afterwards). */
export function setShopSlotCount(value: number): Promise<void> {
  return setEconomyConfigValue("booster_shop_slot_count", value);
}

/** The current value of an economy_config key (global config: tests that change it restore it). */
export async function economyConfigValue(key: string): Promise<number> {
  const { data, error } = await admin
    .from("economy_config")
    .select("value")
    .eq("key", key)
    .single();
  if (error) throw error;
  return Number(data.value);
}

/** Sets an economy_config key directly (service role, no history row), to arrange or restore it. */
export async function setEconomyConfigValue(key: string, value: number): Promise<void> {
  const { error } = await admin.from("economy_config").update({ value }).eq("key", key);
  if (error) throw error;
}

/** The id, cost, card count, shop weight, active flag and rarity chances of a booster définition, by slug. */
export async function boosterBySlug(slug: string): Promise<{
  id: string;
  costCoins: number;
  slots: number;
  shopWeight: number;
  isActive: boolean;
  rarityWeights: Record<string, number>;
}> {
  const { data, error } = await admin
    .from("booster_definitions")
    .select("id, cost_coins, slots, shop_weight, is_active, rarity_weights")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    costCoins: Number(data.cost_coins),
    slots: Number(data.slots),
    shopWeight: Number(data.shop_weight),
    isActive: data.is_active,
    rarityWeights: data.rarity_weights as Record<string, number>,
  };
}

/** The slug of a booster définition, by id (a test booster's slug is generated). */
export async function boosterSlugOf(id: string): Promise<string> {
  const { data, error } = await admin
    .from("booster_definitions")
    .select("slug")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data.slug;
}

/**
 * Sets values of a booster définition straight in the table, through the service role and
 * without any history row: to arrange a test, and to put a real booster back afterwards.
 */
export async function setBoosterDefinition(
  slug: string,
  values: {
    costCoins?: number;
    slots?: number;
    shopWeight?: number;
    isActive?: boolean;
    rarityWeights?: Record<string, number>;
  },
): Promise<void> {
  const { error } = await admin
    .from("booster_definitions")
    .update({
      ...(values.costCoins === undefined ? {} : { cost_coins: values.costCoins }),
      ...(values.slots === undefined ? {} : { slots: values.slots }),
      ...(values.shopWeight === undefined ? {} : { shop_weight: values.shopWeight }),
      ...(values.isActive === undefined ? {} : { is_active: values.isActive }),
      ...(values.rarityWeights === undefined ? {} : { rarity_weights: values.rarityWeights }),
    })
    .eq("slug", slug);
  if (error) throw error;
}

/**
 * Runs `run` with `slug` as the only booster the boutique can offer: every other définition gets a
 * shop weight of 0, straight in the table. Their weights are put back afterwards, even when `run`
 * throws (the weights are global: the other test files rely on them).
 */
export async function withOnlyShopBooster<T>(slug: string, run: () => Promise<T>): Promise<T> {
  const { data, error } = await admin.from("booster_definitions").select("id, slug, shop_weight");
  if (error) throw error;
  const others = (data ?? []).filter((row) => row.slug !== slug);
  try {
    for (const row of others) {
      const { error: zeroError } = await admin
        .from("booster_definitions")
        .update({ shop_weight: 0 })
        .eq("id", row.id);
      if (zeroError) throw zeroError;
    }
    return await run();
  } finally {
    // Every restore is tried; a failed one is thrown so the weights never stay at 0 silently.
    let restoreError: Error | null = null;
    for (const row of others) {
      const { error: restoreFailure } = await admin
        .from("booster_definitions")
        .update({ shop_weight: Number(row.shop_weight) })
        .eq("id", row.id);
      if (restoreFailure) restoreError ??= restoreFailure;
    }
    if (restoreError) throw restoreError;
  }
}

export type ShopSlotRow = { window_index: number; slot_index: number; booster_id: string };

/** The stored offre boutique rows of a player, oldest window first, in emplacement order. */
export async function shopSlotsOf(userId: string): Promise<ShopSlotRow[]> {
  const { data, error } = await admin
    .from("booster_shop_slots")
    .select("window_index, slot_index, booster_id")
    .eq("user_id", userId)
    .order("window_index")
    .order("slot_index");
  if (error) throw error;
  return data.map((row) => ({ ...row, window_index: Number(row.window_index) }));
}

/** The player's inventory: quantity per card. */
export async function inventoryOf(userId: string): Promise<Map<string, number>> {
  const { data, error } = await admin
    .from("user_cards")
    .select("card_id, quantity")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(data.map((row) => [row.card_id, row.quantity]));
}

export async function drawsOf(userId: string) {
  const { data, error } = await admin
    .from("draw_logs")
    .select("id, booster_id, results, roll_seed")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

/** Forces one stored emplacement of a player's offre onto a définition de booster. */
export async function setShopSlot(
  userId: string,
  windowIndex: number,
  slotIndex: number,
  boosterId: string,
): Promise<void> {
  const { data, error } = await admin
    .from("booster_shop_slots")
    .update({ booster_id: boosterId })
    .eq("user_id", userId)
    .eq("window_index", windowIndex)
    .eq("slot_index", slotIndex)
    .select("slot_index");
  if (error) throw error;
  if (data?.length !== 1) {
    throw new Error(`setShopSlot : emplacement ${windowIndex}/${slotIndex} introuvable`);
  }
}

/** Moves a player's stored offre boutique to another window, optionally onto one définition. */
export async function moveShopOffer(
  userId: string,
  windowIndex: number,
  boosterId?: string,
): Promise<void> {
  const { error } = await admin
    .from("booster_shop_slots")
    .update({ window_index: windowIndex, ...(boosterId ? { booster_id: boosterId } : {}) })
    .eq("user_id", userId);
  if (error) throw error;
}

export type ShopSlotExhaustion = {
  slot_index: number;
  opened_at: string | null;
  draw_id: string | null;
};

/** The exhausted state (opened_at, draw_id) of a player's stored emplacements in one window. */
export async function shopSlotExhaustionOf(
  userId: string,
  windowIndex: number,
): Promise<ShopSlotExhaustion[]> {
  const { data, error } = await admin
    .from("booster_shop_slots")
    .select("slot_index, opened_at, draw_id")
    .eq("user_id", userId)
    .eq("window_index", windowIndex)
    .order("slot_index");
  if (error) throw error;
  return data as ShopSlotExhaustion[];
}

/** Credits coins the way an admin adjustment would. */
export async function giveCoins(userId: string, amount: number): Promise<void> {
  const { error } = await admin
    .from("currency_ledger")
    .insert({ user_id: userId, amount, type: "admin_adjust" });
  if (error) throw error;
}

export async function balanceOf(userId: string): Promise<number> {
  const { data, error } = await admin
    .from("currency_ledger")
    .select("amount")
    .eq("user_id", userId);
  if (error) throw error;
  return data.reduce((sum, row) => sum + Number(row.amount), 0);
}

export type LedgerRow = {
  amount: number;
  type: string;
  reference_id: string | null;
  metadata: Record<string, unknown>;
};

export type CoinGrantRow = {
  id: string;
  user_id: string;
  amount: number;
  reason: string | null;
  author_id: string | null;
  created_at: string;
};

/**
 * The coin grants an author made (admin_coin_grants, CYR-118), oldest first. They go with their
 * target's account, so cleanup() needs no step of its own.
 */
export async function coinGrantsBy(authorId: string): Promise<CoinGrantRow[]> {
  const { data, error } = await admin
    .from("admin_coin_grants")
    .select("id, user_id, amount, reason, author_id, created_at")
    .eq("author_id", authorId)
    .order("created_at");
  if (error) throw error;
  return data as CoinGrantRow[];
}

/** The coin grants an account received (admin_coin_grants), oldest first, whoever the author. */
export async function coinGrantsOf(userId: string): Promise<CoinGrantRow[]> {
  const { data, error } = await admin
    .from("admin_coin_grants")
    .select("id, user_id, amount, reason, author_id, created_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data as CoinGrantRow[];
}

/** The player's coin movements, oldest first, optionally of one type only. */
export async function ledgerOf(userId: string, type?: string): Promise<LedgerRow[]> {
  let query = admin
    .from("currency_ledger")
    .select("amount, type, reference_id, metadata")
    .eq("user_id", userId)
    .order("created_at");
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({ ...row, amount: Number(row.amount) }));
}

/**
 * Moves the player's farm clock back, as if they had been away for that long. Uses the
 * database's clock, the one sync_user_economy measures with: the test machine's clock can
 * be a little off from the database container's, enough to lose a coin.
 */
export async function setAwayFor(userId: string, seconds: number): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(userId) || !Number.isFinite(seconds)) {
    throw new Error("setAwayFor : identifiant ou durée invalide");
  }
  const [row] = sql<{ moved: number }>(
    `with moved as (
       update public.profiles
       set last_economy_sync_at = now() - make_interval(secs => ${seconds})
       where id = '${userId}'
       returning id
     )
     select count(*)::int as moved from moved`,
  );
  if (row?.moved !== 1) throw new Error(`setAwayFor : profil ${userId} introuvable`);
}

/**
 * Deletes the users, then the boosters and cards created by this test file (their draws and
 * inventories go with the users). Call it from afterAll.
 */
export async function cleanup(): Promise<void> {
  const failures: string[] = [];
  const userIds = [...createdUsers];
  // The settings history rows these accounts wrote go first, so no row outlives its author.
  if (userIds.length > 0) {
    const { error } = await admin.from("admin_setting_changes").delete().in("author_id", userIds);
    if (error) {
      failures.push(`historique des paramètres : ${error.message}`);
    }
  }
  for (const id of createdUsers.splice(0)) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) failures.push(`compte ${id} : ${error.message}`);
  }
  const boosters = createdBoosters.splice(0);
  if (boosters.length > 0) {
    const { error } = await admin.from("booster_definitions").delete().in("id", boosters);
    if (error) failures.push(`boosters : ${error.message}`);
  }
  const cards = createdCards.splice(0);
  if (cards.length > 0) {
    const { error } = await admin.from("cards").delete().in("id", cards);
    if (error) failures.push(`cartes : ${error.message}`);
  }
  if (failures.length > 0) {
    console.warn(`Données de test non supprimées :\n${failures.join("\n")}`);
  }
}

export async function grantCard(userId: string, cardId: string, quantity = 1): Promise<void> {
  const { error } = await admin.rpc("grant_card", {
    p_user_id: userId,
    p_card_id: cardId,
    p_quantity: quantity,
    p_source: "test",
  });
  if (error) throw error;
}
