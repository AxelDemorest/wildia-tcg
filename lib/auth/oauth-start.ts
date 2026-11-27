import { oauthCallbackUrl } from "@/lib/auth/callback-url";
import { knownLocaleOrDefault } from "@/lib/auth/return-to";

/** The providers the site offers: the only ones a start may name. */
export const OAUTH_PROVIDERS = ["google", "discord"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

function isOAuthProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.some((provider) => provider === value);
}

export type OAuthStartDeps = {
  /** True when the visitor's IP may start another auth attempt. */
  checkRateLimit: () => Promise<boolean>;
  /** The public origin of the site, or null when the request does not tell it. */
  getOrigin: () => Promise<string | null>;
  /** The provider's authorize URL for this callback URL. Throws when it cannot be built. */
  buildAuthorizeUrl: (redirectTo: string, provider: OAuthProvider) => Promise<string>;
};

export type OAuthStartResult =
  { ok: true; url: string } | { ok: false; error: "rate_limited" | "failed" };

/**
 * Starts a provider sign-in: the callback URL (locale-prefixed, with the page to come back to
 * when `returnTo` is an internal path) and the authorize URL to send the visitor to. The provider
 * comes from the browser: one outside `OAUTH_PROVIDERS` is refused. Dependencies are injected so it
 * runs without Next nor Supabase.
 */
export async function runOAuthStart(
  {
    locale: sentLocale,
    returnTo,
    provider,
  }: { locale: string; returnTo: string; provider: string },
  deps: OAuthStartDeps,
): Promise<OAuthStartResult> {
  if (!isOAuthProvider(provider)) return { ok: false, error: "failed" };
  if (!(await deps.checkRateLimit())) return { ok: false, error: "rate_limited" };

  const locale = knownLocaleOrDefault(sentLocale);
  const origin = await deps.getOrigin();
  if (!origin) return { ok: false, error: "failed" };

  try {
    return {
      ok: true,
      url: await deps.buildAuthorizeUrl(oauthCallbackUrl(origin, locale, returnTo), provider),
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}
