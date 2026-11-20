import { describe, expect, it, vi } from "vitest";
import type { CatalogCard } from "@/lib/cards/types";
import { runLoadDraw, type LoadDrawDeps } from "@/lib/boosters/load-draw";

const drawId = "3f1c2b7e-8a4d-4e6f-9b1a-5c7d9e0f2a31";
const booster = { id: "7a9d1e4c-2b3f-4c5d-8e6f-0a1b2c3d4e5f", slug: "standard" };

const stored = [
  { card_id: "card-a", slug: "lynx", rarity: "rare" },
  { card_id: "card-b", slug: "panda", rarity: "common" },
  { card_id: "card-a", slug: "lynx", rarity: "rare" },
];

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

const enriched = (card: (typeof stored)[number], catalog: CatalogCard) => ({
  cardId: card.card_id,
  slug: card.slug,
  rarity: card.rarity,
  name: catalog.name,
  scientific_name: catalog.scientific_name,
  iucn_status: catalog.iucn_status,
  description: catalog.description,
  image_path: catalog.image_path,
  stats: catalog.stats,
});

describe("runLoadDraw", () => {
  it("returns the stored cards in stored order, duplicates kept, enriched, with the booster", async () => {
    const lynx = catalogCard("lynx", "Lynx");
    const panda = catalogCard("panda", "Panda");
    const readDraw = vi.fn(async () => ({
      id: drawId,
      results: stored,
      booster_definitions: booster,
    }));
    const getCatalogCard = vi.fn(async (_locale: string, slug: string) =>
      slug === "lynx" ? lynx : panda,
    );
    const deps: LoadDrawDeps = {
      getUserId: async () => "user-1",
      readDraw,
      getCatalogCard,
    };

    const outcome = await runLoadDraw("fr", drawId, deps);

    expect(outcome).toEqual({
      ok: true,
      draw: {
        drawId,
        booster,
        cards: [enriched(stored[0], lynx), enriched(stored[1], panda), enriched(stored[0], lynx)],
      },
    });
    expect(readDraw).toHaveBeenCalledTimes(1);
    expect(readDraw).toHaveBeenCalledWith(drawId);
    expect(getCatalogCard).toHaveBeenCalledWith("fr", "lynx");
    expect(getCatalogCard).toHaveBeenCalledWith("fr", "panda");
  });

  describe("refusals and failures", () => {
    const lynx = catalogCard("lynx", "Lynx");

    function makeDeps(overrides: Partial<LoadDrawDeps> = {}) {
      const readDraw = vi.fn<LoadDrawDeps["readDraw"]>(async () => ({
        id: drawId,
        results: stored,
        booster_definitions: booster,
      }));
      const getCatalogCard = vi.fn(async () => lynx);
      const deps: LoadDrawDeps = {
        getUserId: async () => "user-1",
        readDraw,
        getCatalogCard,
        ...overrides,
      };
      return { deps, readDraw, getCatalogCard };
    }

    it("refuses with unauthenticated when nobody is signed in, reading nothing", async () => {
      const { deps, readDraw, getCatalogCard } = makeDeps({ getUserId: async () => null });

      const outcome = await runLoadDraw("fr", drawId, deps);

      expect(outcome).toEqual({ ok: false, error: "unauthenticated" });
      expect(readDraw).not.toHaveBeenCalled();
      expect(getCatalogCard).not.toHaveBeenCalled();
    });

    it("answers not_found without reading when the draw id is not a uuid", async () => {
      const { deps, readDraw, getCatalogCard } = makeDeps();

      const outcome = await runLoadDraw("fr", "not-a-uuid", deps);

      expect(outcome).toEqual({ ok: false, error: "not_found" });
      expect(readDraw).not.toHaveBeenCalled();
      expect(getCatalogCard).not.toHaveBeenCalled();
    });

    it.each([
      ["no row (missing draw, or another player's draw hidden by RLS)", null],
      [
        "a row whose results are not a list",
        { id: drawId, results: "oops", booster_definitions: booster },
      ],
    ])("answers not_found, without the catalogue, for %s", async (_label, row) => {
      const { deps, readDraw, getCatalogCard } = makeDeps();
      readDraw.mockResolvedValue(row);

      const outcome = await runLoadDraw("fr", drawId, deps);

      expect(outcome).toEqual({ ok: false, error: "not_found" });
      expect(readDraw).toHaveBeenCalledTimes(1);
      expect(getCatalogCard).not.toHaveBeenCalled();
    });

    it("answers failed when the read rejects", async () => {
      const { deps, getCatalogCard } = makeDeps({
        readDraw: async () => {
          throw new Error("db down");
        },
      });

      const outcome = await runLoadDraw("fr", drawId, deps);

      expect(outcome).toEqual({ ok: false, error: "failed" });
      expect(getCatalogCard).not.toHaveBeenCalled();
    });

    it("gives booster null, cards still enriched, when the booster is no longer readable", async () => {
      const { deps } = makeDeps({
        readDraw: async () => ({ id: drawId, results: [stored[0]], booster_definitions: null }),
      });

      const outcome = await runLoadDraw("fr", drawId, deps);

      expect(outcome).toEqual({
        ok: true,
        draw: { drawId, booster: null, cards: [enriched(stored[0], lynx)] },
      });
    });
  });
});
