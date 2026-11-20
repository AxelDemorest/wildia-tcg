import { describe, expect, it, vi } from "vitest";
import type { CatalogCard } from "@/lib/cards/types";
import { enrichDrawnCards } from "@/lib/boosters/enrich-drawn-cards";
import type { DrawnCard } from "@/lib/boosters/open-result";

function catalogCard(slug: string, name: string): CatalogCard {
  return {
    id: `id-${slug}`,
    slug,
    scientific_name: `Scientificus ${slug}`,
    iucn_status: "EN",
    rarity: "rare",
    image_path: `cards/${slug}.webp`,
    farm_rate_base: 0.5,
    stats: { power: 7, defense: 5, speed: 3 },
    name,
    description: `Description of ${name}`,
  };
}

const drawnA: DrawnCard = { cardId: "card-a", slug: "lynx", rarity: "rare" };
const drawnB: DrawnCard = { cardId: "card-b", slug: "panda", rarity: "common" };

const placeholder = (drawn: DrawnCard) => ({
  ...drawn,
  name: drawn.slug,
  scientific_name: null,
  iucn_status: null,
  description: "",
  image_path: null,
  stats: { power: 0, defense: 0, speed: 0 },
});

const enriched = (drawn: DrawnCard, catalog: CatalogCard) => ({
  ...drawn,
  name: catalog.name,
  scientific_name: catalog.scientific_name,
  iucn_status: catalog.iucn_status,
  description: catalog.description,
  image_path: catalog.image_path,
  stats: catalog.stats,
});

describe("enrichDrawnCards", () => {
  it("merges each drawn card with its catalogue fields, asking the catalogue once per card", async () => {
    const catalog: Record<string, CatalogCard> = {
      lynx: catalogCard("lynx", "Lynx"),
      panda: catalogCard("panda", "Panda"),
    };
    const getCatalogCard = vi.fn(async (_locale: string, slug: string) => catalog[slug]);

    const result = await enrichDrawnCards([drawnA, drawnB], "fr", getCatalogCard);

    expect(result).toEqual([enriched(drawnA, catalog.lynx), enriched(drawnB, catalog.panda)]);
    expect(getCatalogCard).toHaveBeenCalledTimes(2);
    expect(getCatalogCard).toHaveBeenCalledWith("fr", "lynx");
    expect(getCatalogCard).toHaveBeenCalledWith("fr", "panda");
  });

  it("gives two enriched entries, in drawn order, for a slug drawn twice", async () => {
    const lynx = catalogCard("lynx", "Lynx");
    const panda = catalogCard("panda", "Panda");
    const getCatalogCard = vi.fn(async (_locale: string, slug: string) =>
      slug === "lynx" ? lynx : panda,
    );

    const result = await enrichDrawnCards([drawnA, drawnB, drawnA], "en", getCatalogCard);

    expect(result).toEqual([
      enriched(drawnA, lynx),
      enriched(drawnB, panda),
      enriched(drawnA, lynx),
    ]);
    expect(getCatalogCard).toHaveBeenCalledWith("en", "lynx");
    expect(getCatalogCard).toHaveBeenCalledWith("en", "panda");
  });

  it.each([
    ["answers null", async () => null],
    [
      "rejects",
      async () => {
        throw new Error("catalogue down");
      },
    ],
  ])(
    "turns a card into the placeholder when the catalogue %s, and still enriches the other",
    async (_label, failing) => {
      const panda = catalogCard("panda", "Panda");
      const getCatalogCard = vi.fn(async (_locale: string, slug: string) =>
        slug === "lynx" ? failing() : panda,
      );

      const result = await enrichDrawnCards([drawnA, drawnB], "fr", getCatalogCard);

      expect(result).toEqual([placeholder(drawnA), enriched(drawnB, panda)]);
    },
  );
});
