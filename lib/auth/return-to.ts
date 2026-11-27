import { routing, type AppLocale } from "@/i18n/routing";

// Printable ASCII, U+0021–U+007E: `redirect()` writes the path raw into a header, which throws on
// anything else, and browsers strip some control characters from URLs (`/<TAB>/evil.com` would
// become `//evil.com`).
const PRINTABLE_ASCII_ONLY = /^[\u0021-\u007e]*$/;

/**
 * `raw` when it is exactly one of the site's locales, else the default one. Auth actions get their
 * locale from the browser: it goes through here before any redirect is built from it.
 */
export function knownLocaleOrDefault(raw: string | null | undefined): AppLocale {
  return routing.locales.find((locale) => locale === raw) ?? routing.defaultLocale;
}

// Any origin works: only a path that resolves against it to another origin is of interest.
const BASE = "http://n.invalid";

/**
 * The normalized form of `path` when it is a path of this site, else `null`. Anything that could
 * leave the site (`//host`, `/\host`, a scheme) is refused, dot segments and escapes included:
 * `/.//evil.com` and `/%2e//evil.com` normalize to `//evil.com`.
 */
function internalPath(path: string): string | null {
  if (!path.startsWith("/")) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // A malformed escape: what a browser or a proxy would make of it is unknown.
    return null;
  }

  // Decoding never removes a literal `/` or `\`, so `//` and `/\` only need checking once decoded:
  // `/%2F%2Fevil.com` decodes to `//evil.com`.
  // Printable ASCII is checked once decoded only: a character outside it stays so through decoding,
  // and an escape that decodes to one (`/%09/evil.com`, `/%E6%97%A5`) is caught the same way.
  if (
    !PRINTABLE_ASCII_ONLY.test(decoded) ||
    decoded.startsWith("//") ||
    decoded.startsWith("/\\")
  ) {
    return null;
  }

  // Dot segments and backslashes are resolved the way a browser does, then the result is checked:
  // `/x/..//evil.com` is `//evil.com` once normalized, a protocol-relative URL.
  let url: URL;
  try {
    url = new URL(path, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE || url.pathname.startsWith("//")) return null;

  return url.pathname + url.search + url.hash;
}

/**
 * Where to go after signing in: `raw` (the login's `returnTo`) in its normalized form when it is an
 * internal path, query included, else the site home of `locale`. A repeated `returnTo` (an array)
 * is refused.
 */
export function safeReturnTo(raw: string | string[] | undefined, locale: string): string {
  const path = typeof raw === "string" ? internalPath(raw) : null;
  return path ?? `/${knownLocaleOrDefault(locale)}`;
}

/**
 * The login of `locale` that sends the visitor back to `returnTo` (a path of this site) once signed
 * in. `locale` may come from the browser: it goes through `knownLocaleOrDefault`, so a forged one
 * never gives `//evil.com/login`.
 */
export function loginHref(locale: string, returnTo: string): string {
  return `/${knownLocaleOrDefault(locale)}/login?returnTo=${encodeURIComponent(returnTo)}`;
}
