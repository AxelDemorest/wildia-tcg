import { describe, expect, it } from "vitest";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import nextConfig from "@/next.config";

// Next's own matcher decides which remote images /_next/image may fetch: the tests run URLs
// through it, with the patterns of the real config.
function isAllowed(src: string): boolean {
  return hasRemoteMatch([], nextConfig.images?.remotePatterns ?? [], new URL(src));
}

describe("images.remotePatterns", () => {
  it.each([
    ["a Google avatar", "https://lh3.googleusercontent.com/a/ACg8ocLabc123=s96-c"],
    [
      "a Google avatar of the legacy /a-/ form",
      "https://lh3.googleusercontent.com/a-/ALV-UjXabc=s96-c",
    ],
    [
      "a Discord avatar",
      "https://cdn.discordapp.com/avatars/123456789012345678/abcdef0123456789.png",
    ],
    [
      "card art from the Supabase storage",
      "https://abc.supabase.co/storage/v1/object/public/card-art/x.webp",
    ],
  ])("allows %s", (_name, src) => {
    expect(isAllowed(src)).toBe(true);
  });

  it.each([
    ["a Google avatar over http", "http://lh3.googleusercontent.com/a/ACg8ocLabc123=s96-c"],
    [
      "a Discord avatar over http",
      "http://cdn.discordapp.com/avatars/123456789012345678/abcdef0123456789.png",
    ],
    [
      "a Google avatar on an explicit port",
      "https://lh3.googleusercontent.com:8443/a/ACg8ocLabc123=s96-c",
    ],
    ["another googleusercontent host", "https://lh4.googleusercontent.com/a/ACg8ocLabc123=s96-c"],
    [
      "another discordapp.com host",
      "https://other.discordapp.com/avatars/123456789012345678/abcdef0123456789.png",
    ],
    ["the Discord default avatars", "https://cdn.discordapp.com/embed/avatars/2.png"],
    ["a Google path that is not an avatar", "https://lh3.googleusercontent.com/pw/AP1GczOabc"],
  ])("refuses %s", (_name, src) => {
    expect(isAllowed(src)).toBe(false);
  });
});
