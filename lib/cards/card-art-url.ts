import { getPublicEnv } from "@/lib/env";

const BUCKET = "card-art";

/** Public URL for an object in the card-art bucket. */
export function getCardArtPublicUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const base = NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const path = imagePath.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
