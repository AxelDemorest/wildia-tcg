import { describe, expect, it } from "vitest";
import { originFromHeaders } from "@/lib/auth/request-origin";

const reader = (headers: Record<string, string>) => (name: string) => headers[name] ?? null;

describe("originFromHeaders", () => {
  it("builds an https origin from the forwarded proto and host", () => {
    expect(
      originFromHeaders(
        reader({ "x-forwarded-proto": "https", "x-forwarded-host": "tcg.example" }),
      ),
    ).toBe("https://tcg.example");
  });

  it("falls back to the host header, over http, when nothing is forwarded", () => {
    expect(originFromHeaders(reader({ host: "127.0.0.1:3000" }))).toBe("http://127.0.0.1:3000");
  });

  it("returns null when the request tells no host at all", () => {
    expect(originFromHeaders(reader({}))).toBeNull();
  });
});
