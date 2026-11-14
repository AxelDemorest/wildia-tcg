import "server-only";

import { compareRarity } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";
import { getServerEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/admin";

type DrawResult = {
  slug?: string;
};

type DrawnHit = {
  card: CatalogCard;
  drawnAt: string;
};

/**
 * Best recent pulls: scan the latest packs, keep unique cards, prefer higher rarity
 * then recency. Uses the service role because draw_logs is owner-only under RLS.
 * Only public catalog fields are returned — no user id.
 */
export async function listRecentDrawnCards(
  catalog: CatalogCard[],
  limit = 12,
): Promise<CatalogCard[]> {
  if (!getServerEnv().SUPABASE_SERVICE_ROLE_KEY) return [];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("draw_logs")
    .select("results, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, 40));

  if (error || !data) return [];

  const bySlug = new Map(catalog.map((card) => [card.slug, card]));
  const hits: DrawnHit[] = [];

  for (const row of data) {
    const results = row.results as DrawResult[] | null;
    if (!Array.isArray(results)) continue;
    for (const entry of results) {
      const card = entry.slug ? bySlug.get(entry.slug) : undefined;
      if (!card) continue;
      hits.push({ card, drawnAt: row.created_at as string });
    }
  }

  hits.sort(
    (a, b) =>
      compareRarity(b.card.rarity, a.card.rarity) || b.drawnAt.localeCompare(a.drawnAt),
  );

  const seen = new Set<string>();
  const best: CatalogCard[] = [];
  for (const hit of hits) {
    if (seen.has(hit.card.slug)) continue;
    seen.add(hit.card.slug);
    best.push(hit.card);
    if (best.length >= limit) break;
  }

  return best;
}
