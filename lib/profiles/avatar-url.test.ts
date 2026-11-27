import { describe, expect, it } from "vitest";
import { resolveProfileAvatarUrl } from "@/lib/profiles/avatar-url";

const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocLabc123=s96-c";
const DISCORD = "https://cdn.discordapp.com/avatars/123456789012345678/abcdef0123456789.png";

describe("resolveProfileAvatarUrl", () => {
  it("keeps a Google avatar URL, trimmed", () => {
    expect(resolveProfileAvatarUrl(` ${GOOGLE} `)).toBe(GOOGLE);
  });

  it("keeps a Discord avatar URL", () => {
    expect(resolveProfileAvatarUrl(DISCORD)).toBe(DISCORD);
  });

  it("refuses an http URL, even on an allowed host", () => {
    expect(resolveProfileAvatarUrl(GOOGLE.replace("https://", "http://"))).toBeNull();
  });

  it("returns null for a value that does not parse as a URL", () => {
    expect(resolveProfileAvatarUrl("https://")).toBeNull();
    expect(resolveProfileAvatarUrl("   ")).toBeNull();
    expect(resolveProfileAvatarUrl(null)).toBeNull();
    expect(resolveProfileAvatarUrl(undefined)).toBeNull();
  });

  it("refuses an https URL on a host outside the list", () => {
    expect(resolveProfileAvatarUrl("https://evil.example/avatars/1/x.png")).toBeNull();
  });

  it("refuses an https URL on an allowed host but outside its avatar paths", () => {
    expect(resolveProfileAvatarUrl("https://cdn.discordapp.com/embed/avatars/2.png")).toBeNull();
    expect(resolveProfileAvatarUrl("https://cdn.discordapp.com/avatarsX/1/x.png")).toBeNull();
  });

  it("refuses an explicit port, even on an allowed host and path", () => {
    expect(resolveProfileAvatarUrl(GOOGLE.replace(".com/", ".com:8443/"))).toBeNull();
  });
});
