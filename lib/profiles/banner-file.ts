/** Same limit as the profile-banners bucket (file_size_limit). */
export const BANNER_MAX_BYTES = 2 * 1024 * 1024;

const EXTENSION_BY_TYPE: Readonly<Record<string, "jpg" | "png" | "webp">> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type BannerFileCheck =
  | { ok: true; extension: "jpg" | "png" | "webp" }
  | { ok: false; error: "invalid_type" | "too_large" };

/** Accepts a JPEG, PNG or WebP image of at most BANNER_MAX_BYTES. */
export function checkBannerFile(file: { type: string; size: number }): BannerFileCheck {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) return { ok: false, error: "invalid_type" };
  if (file.size > BANNER_MAX_BYTES) return { ok: false, error: "too_large" };
  return { ok: true, extension };
}

/**
 * Where a player's banner lives in the profile-banners bucket. The database only accepts
 * this exact shape in profiles.banner_url (constraint profiles_banner_url_own_file).
 */
export function bannerStoragePath(userId: string, extension: "jpg" | "png" | "webp"): string {
  return `${userId}/banner.${extension}`;
}
