/**
 * The translation to show for a locale: the locale's own, else the French one (the catalogue's
 * source language), else none, in which case the card is not shown.
 */
export function pickTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: string,
): T | null {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === "fr") ??
    null
  );
}
