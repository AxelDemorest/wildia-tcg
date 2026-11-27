import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnv, getServerEnv } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicEnv", () => {
  it("returns the Supabase URL and anon key", () => {
    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    });
  });

  it("refuses a URL that is not one, or a missing key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "your-project.supabase.co");
    expect(() => getPublicEnv()).toThrow();

    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getPublicEnv()).toThrow();
  });
});

describe("getServerEnv", () => {
  it("treats the service role key as optional", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it.each([
    ["true", true],
    ["1", true],
    ["false", false],
    ["yes", false],
  ])("reads ENABLE_DEV_GRANTS=%s as %s", (value, expected) => {
    vi.stubEnv("ENABLE_DEV_GRANTS", value);
    expect(getServerEnv().ENABLE_DEV_GRANTS).toBe(expected);
  });
});
