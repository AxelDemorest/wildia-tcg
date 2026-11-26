import { describe, expect, it, vi } from "vitest";
import {
  AUTH_CODE_LIFETIME_MS,
  runOAuthCallback,
  type OAuthCallbackDeps,
} from "@/lib/auth/oauth-callback";

// The contract under test:
//   runOAuthCallback({ locale, code, returnTo, error, errorCode }, { exchangeCode, writeLocale, logError })
//     -> a site-relative URL
// exchangeCode(code) -> { id, createdAt, lastSignInAt } (throws when refused);
// writeLocale(userId, locale); logError(error) receives what must not be shown.

const NOW = Date.parse("2026-11-26T12:00:00Z");

function deps(user: { createdAt: string; lastSignInAt: string | null }) {
  return {
    exchangeCode: vi.fn(async () => ({ id: "user-1", ...user })),
    writeLocale: vi.fn<OAuthCallbackDeps["writeLocale"]>(async () => {}),
    logError: vi.fn<OAuthCallbackDeps["logError"]>(() => {}),
  };
}

const justCreated = {
  createdAt: new Date(NOW - 2_000).toISOString(),
  lastSignInAt: new Date(NOW).toISOString(),
};
const input = { error: null, errorCode: null };

describe("runOAuthCallback", () => {
  it("sends a callback with neither code nor error to the login with the generic error, without exchanging", async () => {
    const d = deps(justCreated);

    const to = await runOAuthCallback({ locale: "fr", code: null, returnTo: null, ...input }, d);

    expect(to).toBe("/fr/login?error=failed");
    expect(d.exchangeCode).not.toHaveBeenCalled();
  });

  it("falls back to the locale home when the returnTo of the URL is forged", async () => {
    const d = deps(justCreated);

    const to = await runOAuthCallback(
      { locale: "en", code: "abc", returnTo: "//evil.com", ...input },
      d,
    );

    expect(to).toBe("/en");
  });

  it("leaves the locale alone for an account created long before this sign-in", async () => {
    const d = deps({
      createdAt: new Date(NOW - AUTH_CODE_LIFETIME_MS - 60_000 - 86_400_000).toISOString(),
      lastSignInAt: new Date(NOW).toISOString(),
    });

    const to = await runOAuthCallback(
      { locale: "en", code: "abc", returnTo: "/en/collection", ...input },
      d,
    );

    expect(to).toBe("/en/collection");
    expect(d.writeLocale).not.toHaveBeenCalled();
  });

  it("still sends the visitor to returnTo and logs the error when the locale write rejects", async () => {
    const d = deps(justCreated);
    const failure = new Error("database down");
    d.writeLocale.mockRejectedValue(failure);

    const to = await runOAuthCallback(
      { locale: "en", code: "abc", returnTo: "/en/collection", ...input },
      d,
    );

    expect(to).toBe("/en/collection");
    expect(d.logError).toHaveBeenCalledWith(failure);
  });

  it("logs the error and sends the visitor to the login with the generic error when the exchange fails", async () => {
    const d = deps(justCreated);
    const failure = new Error("code refused");
    d.exchangeCode.mockRejectedValue(failure);

    const to = await runOAuthCallback({ locale: "fr", code: "abc", returnTo: null, ...input }, d);

    expect(to).toBe("/fr/login?error=failed");
    expect(d.logError).toHaveBeenCalledWith(failure);
  });

  it("keeps a forged locale out of the login URL of a failure", async () => {
    const d = deps(justCreated);

    const to = await runOAuthCallback(
      { locale: "/evil.com", code: null, returnTo: null, error: "access_denied", errorCode: null },
      d,
    );

    expect(to.startsWith("/fr/login")).toBe(true);
    expect(to).not.toContain("evil.com");
  });
});
