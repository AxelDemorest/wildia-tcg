import "server-only";

import { computeCollectionStats, type CollectionStats } from "@/lib/inventory/collection-stats";
import { countCatalogSpecies } from "@/server/cards/queries";
import { createClient } from "@/lib/supabase/server";
import { listUserCollection } from "@/server/inventory/queries";

async function countBoosterOpens(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("draw_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return null;
  return count ?? 0;
}

export async function getProfileCollectionStats(
  profileId: string,
  locale: string,
  options: { includeOpens: boolean },
): Promise<CollectionStats> {
  const [items, catalogSpeciesCount, opens] = await Promise.all([
    listUserCollection(profileId, locale, "rarity"),
    countCatalogSpecies(),
    options.includeOpens ? countBoosterOpens(profileId) : Promise.resolve(null),
  ]);

  return computeCollectionStats(
    items.map((card) => ({
      rarity: card.rarity,
      quantity: card.quantity,
      name: card.name,
    })),
    catalogSpeciesCount,
    opens,
  );
}