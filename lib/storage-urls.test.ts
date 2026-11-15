// NEXT_PUBLIC_SUPABASE_URL is https://example.supabase.co in tests (vitest.config.ts).
import { describe, expect, it } from "vitest";
import { getCardArtPublicUrl } from "@/lib/cards/card-art-url";
import { cardArtWebpPathForSlug, isCardArtWebpPath } from "@/lib/cards/import/card-art-webp";
import { getProfileBannerPublicUrl } from "@/lib/profiles/banner-url";

const STORAGE = "https://example.supabase.co/storage/v1/object/public";

describe("getCardArtPublicUrl", () => {
  it("builds the public URL of a card image, with or without a leading slash", () => {
    expect(getCardArtPublicUrl("cards/vulpes-vulpes.webp")).toBe(
      `${STORAGE}/card-art/cards/vulpes-vulpes.webp`,
    );
    expect(getCardArtPublicUrl("/cards/vulpes-vulpes.webp")).toBe(
      `${STORAGE}/card-art/cards/vulpes-vulpes.webp`,
    );
  });

  it("returns null without an image", () => {
    expect(getCardArtPublicUrl(null)).toBeNull();
    expect(getCardArtPublicUrl("")).toBeNull();
  });
});

describe("getProfileBannerPublicUrl", () => {
  it("builds the public URL of a banner", () => {
    expect(getProfileBannerPublicUrl("u1/banner.png")).toBe(
      `${STORAGE}/profile-banners/u1/banner.png`,
    );
  });

  it("returns null without a banner", () => {
    expect(getProfileBannerPublicUrl(undefined)).toBeNull();
  });
});

describe("card art files of the import pipeline", () => {
  it("must be WebP before upload", () => {
    expect(isCardArtWebpPath("data/cards/images/lutra-lutra.WEBP")).toBe(true);
    expect(isCardArtWebpPath("data/cards/images/lutra-lutra.jpg")).toBe(false);
    expect(isCardArtWebpPath(null)).toBe(false);
  });

  it("live in data/cards/images/{slug}.webp", () => {
    expect(cardArtWebpPathForSlug("lutra-lutra")).toBe("data/cards/images/lutra-lutra.webp");
  });
});
