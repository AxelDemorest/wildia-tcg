import { describe, expect, it } from "vitest";
import { resolveProfileAvatarUrl } from "@/lib/profiles/avatar-url";

describe("resolveProfileAvatarUrl", () => {
  it("keeps an absolute http(s) URL, trimmed", () => {
    expect(resolveProfileAvatarUrl(" https://cdn.example.com/a.png ")).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(resolveProfileAvatarUrl("http://cdn.example.com/a.png")).toBe(
      "http://cdn.example.com/a.png",
    );
  });

  it("returns null for anything else", () => {
    expect(resolveProfileAvatarUrl("avatars/a.png")).toBeNull();
    expect(resolveProfileAvatarUrl("javascript:alert(1)")).toBeNull();
    expect(resolveProfileAvatarUrl("   ")).toBeNull();
    expect(resolveProfileAvatarUrl(null)).toBeNull();
  });
});
