import type { AppLocale } from "@/i18n/routing";

/** A count written for the locale: fr "1 284" (narrow no-break space), en "1,284". */
export function formatCount(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}
