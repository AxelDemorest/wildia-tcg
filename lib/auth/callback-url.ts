import type { AppLocale } from "@/i18n/routing";
import { safeReturnTo } from "@/lib/auth/return-to";

/**
 * The locale-prefixed auth callback on `origin` for a provider sign-in, carrying the page to come
 * back to when `returnTo` is an internal path.
 */
export function oauthCallbackUrl(origin: string, locale: AppLocale, returnTo: string): string {
  const callback = new URL(`/${locale}/auth/callback`, origin);
  const safe = safeReturnTo(returnTo, locale);
  // The home is the callback's own fallback: no need to carry it.
  if (safe !== `/${locale}`) callback.searchParams.set("returnTo", safe);
  return callback.toString();
}

/**
 * The localized confirmation route on `origin`, which the sign-up and resend mails link to. It
 * always carries the page to come back to: the sanitized `returnTo`, the locale's home by default.
 * The mail template adds the `token_hash`.
 */
export function emailConfirmUrl(origin: string, locale: AppLocale, returnTo: string): string {
  const confirm = new URL(`/${locale}/auth/confirm`, origin);
  confirm.searchParams.set("returnTo", safeReturnTo(returnTo, locale));
  return confirm.toString();
}
