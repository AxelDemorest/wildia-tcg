import { describe, expect, it } from "vitest";
import { knownLocaleOrDefault, loginHref, safeReturnTo } from "@/lib/auth/return-to";

// The contract under test:
//   // lib/auth/return-to.ts
//   safeReturnTo(raw: string | string[] | undefined, locale: string): string
//     Returns `raw` only when it is an internal path (see the cases below); otherwise `/{locale}`,
//     where `locale` itself goes through knownLocaleOrDefault first.
//   knownLocaleOrDefault(raw: string | null | undefined): AppLocale
//     Returns `raw` when it is exactly one of routing.locales ("fr", "en"), else routing.defaultLocale
//     ("fr"). Used by signIn, signUp and signOut before they build a redirect.

describe("safeReturnTo", () => {
  it("keeps an internal path and its query", () => {
    expect(safeReturnTo("/en/admin/accounts?page=2", "en")).toBe("/en/admin/accounts?page=2");
  });

  it.each([
    [undefined, "fr", "/fr"],
    ["", "en", "/en"],
    [["/fr/admin"], "fr", "/fr"],
  ])("falls back to the locale home for %j (locale %s)", (raw, locale, expected) => {
    expect(safeReturnTo(raw, locale)).toBe(expected);
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/%2F%2Fevil.com",
    "/%5Cevil.com",
    "/%E0%A4%A",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\u0000/evil.com",
    "/\u001f/evil.com",
    "/\u007f/evil.com",
    // Outside printable ASCII, raw or once decoded: redirect() writes the path into a header.
    "/日",
    "/%E6%97%A5",
    "/%09/evil.com",
  ])("rejects %j and falls back to the locale home", (raw) => {
    expect(safeReturnTo(raw, "fr")).toBe("/fr");
  });

  // Each of these is a clean-looking path as written, but URL normalization removes the dot
  // segments and leaves `//host` (a backslash counts as `/`): the browser would leave the site.
  it.each([
    "/.//evil.com",
    "/..//evil.com",
    "/x/..//evil.com",
    "/fr/..//evil.com",
    "/%2e//evil.com",
    "/%2e%2e//evil.com",
    "/.\\/evil.com",
    "/./\\evil.com",
    "/.\\\\evil.com",
    "/x/../\\evil.com",
  ])("rejects %j, whose path normalizes to //host, and falls back to the locale home", (raw) => {
    expect(safeReturnTo(raw, "fr")).toBe("/fr");
  });

  it.each([
    ["/fr/./admin", "/fr/admin"],
    ["/fr/x/../admin?page=2", "/fr/admin?page=2"],
  ])("returns the normalized form of %j, not the raw string", (raw, expected) => {
    expect(safeReturnTo(raw, "fr")).toBe(expected);
  });

  it("never builds a protocol-relative URL from a forged locale", () => {
    expect(safeReturnTo("//evil.com", "/evil.com")).toBe("/fr");
  });
});

describe("knownLocaleOrDefault", () => {
  it.each([
    ["en", "en"],
    ["/evil.com", "fr"],
  ])("maps %j to %s", (raw, expected) => {
    expect(knownLocaleOrDefault(raw)).toBe(expected);
  });
});

describe("loginHref", () => {
  it("gives the login of the locale with the encoded page to come back to", () => {
    expect(loginHref("en", "/en/settings/profile")).toBe(
      "/en/login?returnTo=%2Fen%2Fsettings%2Fprofile",
    );
  });

  it.each(["/evil.com"])(
    "never builds a URL outside the site from the forged locale %j",
    (locale) => {
      expect(loginHref(locale, "/fr/collection")).toBe("/fr/login?returnTo=%2Ffr%2Fcollection");
    },
  );
});
