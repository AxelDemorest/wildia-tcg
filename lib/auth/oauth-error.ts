/** What the login says went wrong with a provider sign-in; raw Supabase text is never shown. */
export const OAUTH_ERRORS = [
  "access_denied",
  "email_unusable",
  "account_refused",
  "failed",
] as const;

export type OAuthErrorCode = (typeof OAUTH_ERRORS)[number];

/** What Supabase Auth says when a provider (Discord) answers without an e-mail. */
const NO_EMAIL_DESCRIPTION = "Error getting user email from external provider";

/** What Supabase Auth says when the identity guard (migration `oauth_identity_guard`) refuses. */
const IDENTITY_REFUSED_DESCRIPTION = "Error creating identity";

/**
 * The UI code for what Supabase Auth sent back in `error` / `error_code` / `error_description`.
 * Consent refused is `access_denied`; an unverified provider e-mail (`access_denied` with
 * `provider_email_needs_verification`) and a provider that sends no e-mail are `email_unusable`;
 * an identity the database refuses is `account_refused`; everything else (unknown values, any
 * other `server_error`, …) is `failed`.
 */
export function oauthErrorCode(
  error: string | null,
  errorCode: string | null,
  description: string | null,
): OAuthErrorCode {
  if (error === "access_denied") {
    return errorCode === "provider_email_needs_verification" ? "email_unusable" : "access_denied";
  }
  if (error === "server_error") {
    if (description === NO_EMAIL_DESCRIPTION) return "email_unusable";
    if (description === IDENTITY_REFUSED_DESCRIPTION) return "account_refused";
  }
  return "failed";
}

/** The code named by the login's `?error=` value; a missing or unknown value shows nothing. */
export function parseOAuthError(value: string | null): OAuthErrorCode | null {
  return OAUTH_ERRORS.find((code) => code === value) ?? null;
}
