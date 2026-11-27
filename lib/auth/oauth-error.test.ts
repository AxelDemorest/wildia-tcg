import { describe, expect, it } from "vitest";
import { oauthErrorCode, parseOAuthError } from "@/lib/auth/oauth-error";

// The contract under test (lib/auth/oauth-error.ts, model: lib/boosters/shop-notice.ts):
//   OAUTH_ERRORS = ["access_denied", "email_unusable", "account_refused", "link_expired", "failed"] as const
//   oauthErrorCode(error, errorCode, description: string | null): OAuthErrorCode
//     what Supabase Auth sent in `error` / `error_code` / `error_description` -> the UI code
//   parseOAuthError(value: string | null): OAuthErrorCode | null
//     the login's `?error=` value; anything outside the closed list shows nothing.

describe("oauthErrorCode", () => {
  it.each([
    ["access_denied", "provider_email_needs_verification", null, "email_unusable"],
    ["access_denied", "some_unknown_code", null, "access_denied"],
    ["bad_oauth_state", "bad_oauth_state", null, "failed"],
    // Discord answers without an e-mail with a server_error carrying this exact description.
    [
      "server_error",
      "unexpected_failure",
      "Error getting user email from external provider",
      "email_unusable",
    ],
    ["server_error", "unexpected_failure", "Unexpected failure", "failed"],
    // The identity guard (R1, R2) refuses the insert in auth.identities.
    ["server_error", "unexpected_failure", "Error creating identity", "account_refused"],
    // A description alone proves nothing: it only counts behind a server_error.
    ["bad_oauth_state", null, "Error creating identity", "failed"],
  ])(
    "maps error=%s error_code=%s description=%s to %s",
    (error, errorCode, description, expected) => {
      expect(oauthErrorCode(error, errorCode, description)).toBe(expected);
    },
  );
});

describe("parseOAuthError", () => {
  it.each(["access_denied", "email_unusable", "account_refused", "failed"])(
    "keeps the known code %s",
    (code) => {
      expect(parseOAuthError(code)).toBe(code);
    },
  );

  it.each(["Unable to exchange external code: abc"])(
    "returns null for the value %j outside the closed list",
    (value) => {
      expect(parseOAuthError(value)).toBeNull();
    },
  );
});
