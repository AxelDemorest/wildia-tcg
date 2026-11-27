import { describe, expect, it } from "vitest";
import { emailConfirmUrl } from "@/lib/auth/callback-url";

const ORIGIN = "https://tcg.example";

describe("emailConfirmUrl", () => {
  it("points at the locale's confirmation route on the origin, carrying the sanitized returnTo", () => {
    expect(emailConfirmUrl(ORIGIN, "en", "/en/collection")).toBe(
      `${ORIGIN}/en/auth/confirm?returnTo=%2Fen%2Fcollection`,
    );
  });

  it("carries the locale's home when the returnTo is forged", () => {
    expect(emailConfirmUrl(ORIGIN, "fr", "//evil.com")).toBe(
      `${ORIGIN}/fr/auth/confirm?returnTo=%2Ffr`,
    );
  });
});
