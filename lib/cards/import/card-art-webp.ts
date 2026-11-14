/** Local card art must be WebP before upload to Supabase Storage. */
export function isCardArtWebpPath(localPath: string | null | undefined): boolean {
  return localPath != null && localPath.toLowerCase().endsWith(".webp");
}

export function cardArtWebpPathForSlug(slug: string): string {
  return `data/cards/images/${slug}.webp`;
}
