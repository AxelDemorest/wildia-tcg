import { describe, expect, it, vi } from "vitest";
import { runOAuthStart } from "@/lib/auth/oauth-start";

// The contract under test:
//   runOAuthStart({ locale, returnTo }, { checkRateLimit, getOrigin, buildAuthorizeUrl })
//     -> { ok: true, url } | { ok: false, error: "rate_limited" | "failed" }
// checkRateLimit(): true when the visitor's IP may start another auth attempt (as
// `assertAuthRateLimit`); buildAuthorizeUrl(redirectTo) is the provider's authorize URL.

const ORIGIN = "https://tcg.example";

function deps(overrides: { allowed?: boolean } = {}) {
  return {
    checkRateLimit: vi.fn(async () => overrides.allowed ?? true),
    getOrigin: vi.fn(async () => ORIGIN as string | null),
    buildAuthorizeUrl: vi.fn(
      async (redirectTo: string) => `https://auth.test/authorize?to=${redirectTo}`,
    ),
  };
}

describe("runOAuthStart", () => {
  it("refuses with rate_limited and never builds the authorize URL when the limiter refuses", async () => {
    const d = deps({ allowed: false });

    const result = await runOAuthStart({ locale: "fr", returnTo: "" }, d);

    expect(result).toEqual({ ok: false, error: "rate_limited" });
    expect(d.buildAuthorizeUrl).not.toHaveBeenCalled();
  });

  it("answers failed and never builds the authorize URL when the request tells no host", async () => {
    const d = deps();
    d.getOrigin.mockResolvedValue(null);

    const result = await runOAuthStart({ locale: "fr", returnTo: "" }, d);

    expect(result).toEqual({ ok: false, error: "failed" });
    expect(d.buildAuthorizeUrl).not.toHaveBeenCalled();
  });

  it("gives the provider a callback URL on our origin for a forged locale", async () => {
    const d = deps();

    await runOAuthStart({ locale: "/evil.com", returnTo: "" }, d);

    expect(d.buildAuthorizeUrl).toHaveBeenCalledTimes(1);
    const url = new URL(d.buildAuthorizeUrl.mock.calls[0][0]);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/fr/auth/callback");
  });

  it("gives the provider a callback URL without returnTo for a protocol-relative returnTo", async () => {
    const d = deps();

    await runOAuthStart({ locale: "fr", returnTo: "//evil.com" }, d);

    expect(d.buildAuthorizeUrl).toHaveBeenCalledTimes(1);
    expect(d.buildAuthorizeUrl).toHaveBeenCalledWith(`${ORIGIN}/fr/auth/callback`);
  });
});
