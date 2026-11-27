import "server-only";

import { createClient } from "@/lib/supabase/server";
import { pickTranslation } from "@/lib/cards/translation";
import type { CardRarity, CardStats, CatalogCard, IucnStatus } from "@/lib/cards/types";

type CardQueryRow = {
  id: string;
  slug: string;
  scientific_name: string | null;
  iucn_status: IucnStatus | null;
  rarity: CardRarity;
  image_path: string | null;
  farm_rate_base: number;
  stats: CardStats;
  card_translations: {
    locale: string;
    name: string;
    description: string;
  }[];
};

const CARD_COLUMNS = `
  id,
  slug,
  scientific_name,
  iucn_status,
  rarity,
  image_path,
  farm_rate_base,
  stats,
  card_translations ( locale, name, description )
`;

function mapCard(row: CardQueryRow, locale: string): CatalogCard | null {
  const translation = pickTranslation(row.card_translations, locale);
  if (!translation) return null;

  return {
    id: row.id,
    slug: row.slug,
    scientific_name: row.scientific_name,
    iucn_status: row.iucn_status,
    rarity: row.rarity,
    image_path: row.image_path,
    farm_rate_base: Number(row.farm_rate_base),
    stats: row.stats,
    name: translation.name,
    description: translation.description,
  };
}

export async function listCatalogCards(
  locale: string,
  options?: { rarity?: CardRarity | null },
): Promise<CatalogCard[]> {
  const supabase = await createClient();
  let query = supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .order("rarity", { ascending: true })
    .order("slug", { ascending: true });

  if (options?.rarity) {
    query = query.eq("rarity", options.rarity);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data as CardQueryRow[])
    .map((row) => mapCard(row, locale))
    .filter((card): card is CatalogCard => card !== null);
}

export async function getCatalogCardBySlug(
  locale: string,
  slug: string,
): Promise<CatalogCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  return mapCard(data as CardQueryRow, locale);
}

/** Playable species in the catalogue (rows in `cards`). */
export async function countCatalogSpecies(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getCatalogCardById(
  locale: string,
  cardId: string,
): Promise<CatalogCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  return mapCard(data as CardQueryRow, locale);
}
