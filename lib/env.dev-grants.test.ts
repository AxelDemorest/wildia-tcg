import { afterEach, describe, expect, it } from "vitest";
import { isDevGrantsEnabled } from "@/lib/env";

describe("isDevGrantsEnabled", () => {
  const prev = process.env.ENABLE_DEV_GRANTS;

  afterEach(() => {
    process.env.ENABLE_DEV_GRANTS = prev;
  });

  it("is false by default", () => {
    delete process.env.ENABLE_DEV_GRANTS;
    expect(isDevGrantsEnabled()).toBe(false);
  });

  it("is true when ENABLE_DEV_GRANTS=true", () => {
    process.env.ENABLE_DEV_GRANTS = "true";
    expect(isDevGrantsEnabled()).toBe(true);
  });
});
