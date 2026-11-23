import type { AppLocale } from "@/i18n/routing";

// The team works from France: every admin date reads in Paris time, whatever the server's zone.
const TIME_ZONE = "Europe/Paris";

/** A day of the espace administration: fr "21 nov. 2026", en "Nov 21, 2026". */
export function formatAdminDate(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, dateStyle: "medium" }).format(
    new Date(iso),
  );
}

/** A day and time: fr "21 nov. 2026, 14:32", en "Nov 21, 2026, 2:32 PM" (12-hour clock). */
export function formatAdminDateTime(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
