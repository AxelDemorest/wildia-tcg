/** The `Boosters.pack` messages, as next-intl's translator reads them. */
export type PackTranslator = {
  (key: string): string;
  has: (key: string) => boolean;
};

/**
 * A booster's name in the espace administration: its short name, or its slug for a booster
 * without one (one added in the database before its messages), read without a missing-message
 * error.
 */
export function boosterName(slug: string, t: PackTranslator): string {
  const key = `${slug}.short`;
  return t.has(key) ? t(key) : slug;
}
