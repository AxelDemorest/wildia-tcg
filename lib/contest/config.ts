/**
 * Active "coming soon" contest. Single place to edit when the prize changes:
 * - `cardSlug`: slug of the catalog card shown (and offered) on the page.
 * - `key`: stored with every entry. Change it with the prize so each contest
 *   keeps its own list of participants.
 */
export const CONTEST = {
  key: "launch-2026-tiger",
  cardSlug: "panthera-tigris",
} as const;
