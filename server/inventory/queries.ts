import "server-only";

import { compareRarity } from "@/lib/cards/rarity";
import type { CardRarity, CardStats, CatalogCard, IucnStatus } from "@/lib/cards/types";
import { createClient } from "@/lib/supabase/server";

export type CollectionCard = CatalogCard & { quantity: number };

type CardEmbed = {
  id: string;
  slug: string;
  scientific_name: string | null;
  iucn_status: IucnStatus | null;
  rarity: CardRarity;
  image_path: string | null;
  farm_rate_base: number;
  stats: CardStats;
  card_translations: { locale: string; name: string; description: string }[];
};

type Row = {
  quantity: number;
  cards: CardEmbed | CardEmbed[] | null;
};

export type CollectionSortOption = "rarity" | "name" | "quantity";

export async function getUserCardQuantity(userId: string, cardId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_cards")
    .select("quantity")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data?.quantity ?? 0;
}

export async function listUserCollection(
  userId: string,
  locale: string,
  sort: CollectionSortOption = "rarity",
): Promise<CollectionCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_cards")
    .select(
      `
      quantity,
      cards (
        id,
        slug,
        scientific_name,
        iucn_status,
        rarity,
        image_path,
        farm_rate_base,
        stats,
        card_translations ( locale, name, description )
      )
    `,
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const items: CollectionCard[] = (data as Row[])
    .map((row) => {
      const card = Array.isArray(row.cards) ? row.cards[0] : row.cards;
      if (!card) return null;
      const translation =
        card.card_translations.find((t) => t.locale === locale) ??
        card.card_translations.find((t) => t.locale === "fr");
      if (!translation) return null;

      return {
        id: card.id,
        slug: card.slug,
        scientific_name: card.scientific_name,
        iucn_status: card.iucn_status,
        rarity: card.rarity,
        image_path: card.image_path,
        farm_rate_base: Number(card.farm_rate_base),
        stats: card.stats,
        name: translation.name,
        description: translation.description,
        quantity: row.quantity,
      };
    })
    .filter((c): c is CollectionCard => c !== null);

  return sortCollection(items, sort);
}

function sortCollection(
  items: CollectionCard[],
  sort: CollectionSortOption,
): CollectionCard[] {
  const copy = [...items];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    case "quantity":
      return copy.sort((a, b) => b.quantity - a.quantity);
    case "rarity":
    default:
      return copy.sort((a, b) => {
        const byRarity = compareRarity(b.rarity, a.rarity);
        if (byRarity !== 0) return byRarity;
        return a.name.localeCompare(b.name, "fr");
      });
  }
}
