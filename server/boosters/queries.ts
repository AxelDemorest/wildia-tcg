import "server-only";

import type { CardRarity } from "@/lib/cards/types";
import { createClient } from "@/lib/supabase/server";

export type BoosterDefinition = {
  id: string;
  slug: string;
  costCoins: number;
  slots: number;
  rarityWeights: Partial<Record<CardRarity, number>>;
  sortOrder: number;
};

type Row = {
  id: string;
  slug: string;
  cost_coins: number;
  slots: number;
  rarity_weights: Partial<Record<CardRarity, number>>;
  sort_order: number;
};

export async function listActiveBoosters(): Promise<BoosterDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booster_definitions")
    .select("id, slug, cost_coins, slots, rarity_weights, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    costCoins: Number(row.cost_coins),
    slots: row.slots,
    rarityWeights: row.rarity_weights,
    sortOrder: row.sort_order,
  }));
}

export async function getBoosterById(id: string): Promise<BoosterDefinition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booster_definitions")
    .select("id, slug, cost_coins, slots, rarity_weights, sort_order")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as Row;
  return {
    id: row.id,
    slug: row.slug,
    costCoins: Number(row.cost_coins),
    slots: row.slots,
    rarityWeights: row.rarity_weights,
    sortOrder: row.sort_order,
  };
}
