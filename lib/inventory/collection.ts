import { compareRarity } from "@/lib/cards/rarity";
import type { CatalogCard } from "@/lib/cards/types";

export type CollectionCard = CatalogCard & { quantity: number };

export type CollectionSortOption = "rarity" | "name" | "quantity";

export const COLLECTION_PAGE_SIZE = 48;

export type PaginatedCollection<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
};

/** Clamps to [1, pageCount] (or page 1 when empty). */
export function parseCollectionPage(value: string | undefined, pageCount: number): number {
  if (pageCount < 1) return 1;
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (parsed > pageCount) return pageCount;
  return parsed;
}

export function paginateCollection<T>(
  items: readonly T[],
  page: number,
  pageSize = COLLECTION_PAGE_SIZE,
): PaginatedCollection<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = parseCollectionPage(String(page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}

/**
 * Orders the binder: rarest first then by name (default), by name, or most copies first.
 * Returns a new array.
 */
export function sortCollection(
  items: readonly CollectionCard[],
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
