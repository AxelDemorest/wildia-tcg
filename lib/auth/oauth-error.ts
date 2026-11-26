/** What the login says went wrong with a provider sign-in; raw Supabase text is never shown. */
export const OAUTH_ERRORS = ["access_denied", "email_unusable", "failed"] as const;

export type OAuthErrorCode = (typeof OAUTH_ERRORS)[number];

/**
 * The UI code for what Supabase Auth sent back in `error` / `error_code`. Consent refused is
 * `access_denied`; an unverified provider e-mail is `access_denied` with
 * `provider_email_needs_verification`; everything else (unknown values, `server_error`, …) is
 * `failed`.
 */
export function oauthErrorCode(error: string | null, errorCode: string | null): OAuthErrorCode {
  if (error !== "access_denied") return "failed";
  return errorCode === "provider_email_needs_verification" ? "email_unusable" : "access_denied";
}

/** The code named by the login's `?error=` value; a missing or unknown value shows nothing. */
export function parseOAuthError(value: string | null): OAuthErrorCode | null {
  return OAUTH_ERRORS.find((code) => code === value) ?? null;
}
