import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "@/lib/rate-limit/client-ip";

function headers(values: Record<string, string>) {
  return (name: string) => values[name] ?? null;
}

describe("clientIpFromHeaders", () => {
  it("takes the first address of x-forwarded-for, trimmed", () => {
    expect(
      clientIpFromHeaders(headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1, 10.0.0.2" })),
    ).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFromHeaders(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("skips a blank x-forwarded-for instead of using an empty key", () => {
    expect(
      clientIpFromHeaders(headers({ "x-forwarded-for": " ", "x-real-ip": "198.51.100.4" })),
    ).toBe("198.51.100.4");
  });

  it("returns unknown without any address", () => {
    expect(clientIpFromHeaders(headers({}))).toBe("unknown");
  });
});
