import { getPublicEnv } from "@/lib/env";

const BUCKET = "profile-banners";

/** Public URL for an object in the profile-banners bucket. */
export function getProfileBannerPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const base = NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const objectPath = path.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}
