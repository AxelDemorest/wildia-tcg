/** Public URL for profile avatar (absolute URL or storage path). */
export function resolveProfileAvatarUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return null;
}
