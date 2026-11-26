import { describe, expect, it } from "vitest";
import { oauthErrorCode, parseOAuthError } from "@/lib/auth/oauth-error";

// The contract under test (lib/auth/oauth-error.ts, model: lib/boosters/shop-notice.ts):
//   OAUTH_ERRORS = ["access_denied", "email_unusable", "failed"] as const
//   oauthErrorCode(error: string | null, errorCode: string | null): OAuthErrorCode
//     what Supabase Auth sent in `error` / `error_code` -> the UI code
//   parseOAuthError(value: string | null): OAuthErrorCode | null
//     the login's `?error=` value; anything outside the closed list shows nothing.

describe("oauthErrorCode", () => {
  it.each([
    ["access_denied", "provider_email_needs_verification", "email_unusable"],
    ["access_denied", "some_unknown_code", "access_denied"],
    ["bad_oauth_state", "bad_oauth_state", "failed"],
  ])("maps error=%s error_code=%s to %s", (error, errorCode, expected) => {
    expect(oauthErrorCode(error, errorCode)).toBe(expected);
  });
});

describe("parseOAuthError", () => {
  it.each(["access_denied", "email_unusable", "failed"])("keeps the known code %s", (code) => {
    expect(parseOAuthError(code)).toBe(code);
  });

  it.each(["Unable to exchange external code: abc"])(
    "returns null for the value %j outside the closed list",
    (value) => {
      expect(parseOAuthError(value)).toBeNull();
    },
  );
});
