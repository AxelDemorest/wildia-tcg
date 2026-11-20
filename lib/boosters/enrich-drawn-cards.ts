import type { DrawnCard } from "@/lib/boosters/open-result";
import type { CatalogCard } from "@/lib/cards/types";

/** A drawn card with the catalogue fields its face de carte shows during the révélation. */
export type RevealedCard = DrawnCard &
  Pick<
    CatalogCard,
    "name" | "scientific_name" | "iucn_status" | "description" | "image_path" | "stats"
  >;

export type GetCatalogCard = (locale: string, slug: string) => Promise<CatalogCard | null>;

/**
 * Merges each drawn card, in drawn order, with its catalogue entry in the given locale. A card the
 * catalogue lacks, or fails to return, becomes a neutral card named after its slug.
 */
export function enrichDrawnCards(
  cards: DrawnCard[],
  locale: string,
  getCatalogCard: GetCatalogCard,
): Promise<RevealedCard[]> {
  return Promise.all(
    cards.map(async (drawn) => {
      const catalog = await getCatalogCard(locale, drawn.slug).catch(() => null);
      if (!catalog) {
        return {
          ...drawn,
          name: drawn.slug,
          scientific_name: null,
          iucn_status: null,
          description: "",
          image_path: null,
          stats: { power: 0, defense: 0, speed: 0 },
        };
      }
      return {
        ...drawn,
        name: catalog.name,
        scientific_name: catalog.scientific_name,
        iucn_status: catalog.iucn_status,
        description: catalog.description,
        image_path: catalog.image_path,
        stats: catalog.stats,
      };
    }),
  );
}
