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
 * Runs one read-only SQL statement on the local database (supabase db query --local), for
 * checks the Data API cannot see, such as privileges in the Postgres catalog.
 */
export function sql<Row = Record<string, unknown>>(statement: string): Row[] {
  const output = execFileSync(
    "npx",
    ["supabase", "db", "query", "--local", "-o", "json", statement],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(output).rows as Row[];
}

export type Player = { id: string; client: SupabaseClient };

const createdUsers: string[] = [];
const createdCards: string[] = [];
const createdBoosters: string[] = [];

/** Creates a confirmed user and returns a client signed in as that user, like the app's. */
export async function createPlayer(): Promise<Player> {
  const email = `test-${randomUUID()}@example.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdUsers.push(data.user.id);

  const client = createClient(url, anonKey, options);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

/** Deletes a player's account now, as the dashboard or an account deletion would. */
export async function deletePlayer(player: Player) {
  const result = await admin.auth.admin.deleteUser(player.id);
  if (!result.error) createdUsers.splice(createdUsers.indexOf(player.id), 1);
  return result;
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

/** Adds an active booster that only draws the given rarities. */
export async function createBooster(
  rarityWeights: Record<string, number>,
  costCoins = 100,
  isActive = true,
): Promise<string> {
  const { data, error } = await admin
    .from("booster_definitions")
    .insert({
      slug: `test-${randomUUID()}`,
      cost_coins: costCoins,
      rarity_weights: rarityWeights,
      is_active: isActive,
    })
    .select("id")
    .single();
  if (error) throw error;
  createdBoosters.push(data.id);
  return data.id;
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

/**
 * Deletes the users, then the boosters and cards created by this test file (their draws and
 * inventories go with the users). Call it from afterAll.
 */
export async function cleanup(): Promise<void> {
  const failures: string[] = [];
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
