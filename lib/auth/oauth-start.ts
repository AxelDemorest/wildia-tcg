import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";

export type OAuthStartDeps = {
  /** True when the visitor's IP may start another auth attempt. */
  checkRateLimit: () => Promise<boolean>;
  /** The public origin of the site, or null when the request does not tell it. */
  getOrigin: () => Promise<string | null>;
  /** The provider's authorize URL for this callback URL. Throws when it cannot be built. */
  buildAuthorizeUrl: (redirectTo: string) => Promise<string>;
};

export type OAuthStartResult =
  { ok: true; url: string } | { ok: false; error: "rate_limited" | "failed" };

/**
 * Starts a provider sign-in: the callback URL (locale-prefixed, with the page to come back to
 * when `returnTo` is an internal path) and the authorize URL to send the visitor to. Dependencies
 * are injected so it runs without Next nor Supabase.
 */
export async function runOAuthStart(
  { locale: sentLocale, returnTo }: { locale: string; returnTo: string },
  deps: OAuthStartDeps,
): Promise<OAuthStartResult> {
  if (!(await deps.checkRateLimit())) return { ok: false, error: "rate_limited" };

  const locale = knownLocaleOrDefault(sentLocale);
  const origin = await deps.getOrigin();
  if (!origin) return { ok: false, error: "failed" };

  const callback = new URL(`/${locale}/auth/callback`, origin);
  const safe = safeReturnTo(returnTo, locale);
  // The home is the callback's own fallback: no need to carry it.
  if (safe !== `/${locale}`) callback.searchParams.set("returnTo", safe);

  try {
    return { ok: true, url: await deps.buildAuthorizeUrl(callback.toString()) };
  } catch {
    return { ok: false, error: "failed" };
  }
}
