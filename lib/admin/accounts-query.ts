/** Longest search the registre des comptes inscrits runs, in characters; the rest is dropped. */
const MAX_SEARCH_LENGTH = 100;

/**
 * The registry's search term, from the `q` search param as Next gives it: trimmed, cut at 100
 * characters. Absent or repeated (an array), the term is empty: the whole registry.
 */
export function parseSearchTerm(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "";
  // Cut by code point: halving an emoji would send a lone surrogate to the database.
  return Array.from(value.trim()).slice(0, MAX_SEARCH_LENGTH).join("");
}

/**
 * Highest page a URL may ask for: its offset, (page − 1) × 50, stays far within the SQL function's
 * integer parameter.
 */
const MAX_PAGE = 1_000_000;

/**
 * The registry's page, from the `page` search param as Next gives it: a whole number from 1 to
 * 1,000,000, in digits only. Anything else, absent or repeated included, is page 1.
 */
export function parsePage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return page <= MAX_PAGE ? page : 1;
}
