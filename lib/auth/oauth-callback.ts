import { oauthErrorCode, type OAuthErrorCode } from "@/lib/auth/oauth-error";
import { knownLocaleOrDefault, safeReturnTo } from "@/lib/auth/return-to";

/** How long an auth code lives in Supabase Auth: an account this young at sign-in is a new one. */
export const AUTH_CODE_LIFETIME_MS = 5 * 60 * 1000;

export type ExchangedUser = {
  id: string;
  createdAt: string;
  lastSignInAt: string | null;
};

export type OAuthCallbackDeps = {
  /** Trades the auth code for a session (cookies set). Throws when Supabase Auth refuses it. */
  exchangeCode: (code: string) => Promise<ExchangedUser>;
  writeLocale: (userId: string, locale: string) => Promise<void>;
  /** Receives what must not be shown to the visitor. */
  logError: (error: unknown) => void;
};

/** The login with the error to show, and the page to come back to when there is one. */
export function failureUrl(locale: string, code: OAuthErrorCode, returnTo: string | null): string {
  const knownLocale = knownLocaleOrDefault(locale);
  const params = new URLSearchParams({ error: code });
  const safe = safeReturnTo(returnTo ?? undefined, knownLocale);
  if (safe !== `/${knownLocale}`) params.set("returnTo", safe);
  return `/${knownLocale}/login?${params}`;
}

function isJustCreated({ createdAt, lastSignInAt }: ExchangedUser): boolean {
  if (!lastSignInAt) return false;
  const elapsed = Date.parse(lastSignInAt) - Date.parse(createdAt);
  return elapsed <= AUTH_CODE_LIFETIME_MS;
}

/**
 * Finishes a provider sign-in and says where to send the visitor (a site-relative URL). The locale
 * of the callback URL becomes the profile's locale for an account created by this very sign-in
 * (Supabase cannot carry it through the provider). Dependencies are injected so it runs without
 * Next nor Supabase.
 */
export async function runOAuthCallback(
  {
    locale,
    code,
    returnTo,
    error,
    errorCode,
    errorDescription,
  }: {
    locale: string;
    code: string | null;
    returnTo: string | null;
    /** `error`, `error_code` and `error_description` of the callback URL, as Supabase Auth sent them. */
    error: string | null;
    errorCode: string | null;
    errorDescription: string | null;
  },
  deps: OAuthCallbackDeps,
): Promise<string> {
  if (error)
    return failureUrl(locale, oauthErrorCode(error, errorCode, errorDescription), returnTo);
  if (!code) return failureUrl(locale, "failed", returnTo);

  let user: ExchangedUser;
  try {
    user = await deps.exchangeCode(code);
  } catch (exchangeError) {
    deps.logError(exchangeError);
    return failureUrl(locale, "failed", returnTo);
  }

  if (isJustCreated(user)) {
    // The sign-in succeeded: a profile that keeps its default locale is not worth failing it.
    await deps.writeLocale(user.id, locale).catch(deps.logError);
  }

  // Sanitized again here: the URL's returnTo can be forged.
  return safeReturnTo(returnTo ?? undefined, locale);
}
