import { describe, expect, it } from "vitest";
import type { CardRarity } from "@/lib/cards/types";
import {
  paginateCollection,
  parseCollectionPage,
  sortCollection,
  type CollectionCard,
} from "@/lib/inventory/collection";

function card(name: string, rarity: CardRarity, quantity: number): CollectionCard {
  return {
    id: name,
    slug: name,
    scientific_name: null,
    iucn_status: null,
    rarity,
    image_path: null,
    farm_rate_base: 0,
    stats: { power: 0, defense: 0, speed: 0 },
    name,
    description: "",
    quantity,
  };
}

const items = [
  card("Écureuil roux", "common", 3),
  card("Tigre", "epic", 1),
  card("Blaireau", "common", 7),
  card("Cerf du père David", "mythic", 2),
];

const names = (list: CollectionCard[]) => list.map((c) => c.name);

describe("sortCollection", () => {
  it("puts the rarest first, then sorts by name within a rarity (default)", () => {
    expect(names(sortCollection(items, "rarity"))).toEqual([
      "Cerf du père David",
      "Tigre",
      "Blaireau",
      "Écureuil roux",
    ]);
  });

  it("sorts by name with French ordering (accents next to their letter)", () => {
    expect(names(sortCollection(items, "name"))).toEqual([
      "Blaireau",
      "Cerf du père David",
      "Écureuil roux",
      "Tigre",
    ]);
  });

  it("puts the most copies first", () => {
    expect(sortCollection(items, "quantity").map((c) => c.quantity)).toEqual([7, 3, 2, 1]);
  });

  it("leaves the list it was given untouched", () => {
    const before = names(items);
    sortCollection(items, "name");
    expect(names(items)).toEqual(before);
  });
});

describe("paginateCollection", () => {
  const many = Array.from({ length: 50 }, (_, index) => card(`C${index}`, "common", 1));

  it("returns the first page of 48 items by default", () => {
    const { items, page, pageCount, total } = paginateCollection(many, 1);
    expect(items).toHaveLength(48);
    expect(page).toBe(1);
    expect(pageCount).toBe(2);
    expect(total).toBe(50);
  });

  it("returns the remainder on the last page", () => {
    const { items, page } = paginateCollection(many, 2);
    expect(items).toHaveLength(2);
    expect(page).toBe(2);
  });
});

describe("parseCollectionPage", () => {
  it("clamps invalid or high page numbers", () => {
    expect(parseCollectionPage(undefined, 3)).toBe(1);
    expect(parseCollectionPage("0", 3)).toBe(1);
    expect(parseCollectionPage("99", 3)).toBe(3);
  });
});
