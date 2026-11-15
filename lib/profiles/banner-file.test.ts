import { describe, expect, it } from "vitest";
import { BANNER_MAX_BYTES, bannerStoragePath, checkBannerFile } from "@/lib/profiles/banner-file";

describe("checkBannerFile", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])("accepts %s, stored as .%s", (type, extension) => {
    expect(checkBannerFile({ type, size: 1000 })).toEqual({ ok: true, extension });
  });

  it("refuses other types, SVG included", () => {
    expect(checkBannerFile({ type: "image/svg+xml", size: 1000 })).toEqual({
      ok: false,
      error: "invalid_type",
    });
    expect(checkBannerFile({ type: "image/gif", size: 1000 })).toEqual({
      ok: false,
      error: "invalid_type",
    });
  });

  it("accepts exactly the size limit and refuses one byte more", () => {
    expect(checkBannerFile({ type: "image/png", size: BANNER_MAX_BYTES }).ok).toBe(true);
    expect(checkBannerFile({ type: "image/png", size: BANNER_MAX_BYTES + 1 })).toEqual({
      ok: false,
      error: "too_large",
    });
  });
});

describe("bannerStoragePath", () => {
  it("is {user id}/banner.{extension}, the only shape the database accepts", () => {
    const userId = "8aee56e5-1111-4222-8333-444455556666";
    expect(bannerStoragePath(userId, "webp")).toBe(`${userId}/banner.webp`);
    expect(bannerStoragePath(userId, "jpg")).toMatch(
      new RegExp(`^${userId}/banner\\.(png|jpg|webp)$`),
    );
  });
});
