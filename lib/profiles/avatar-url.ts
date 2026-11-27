import { AVATAR_REMOTE_PATTERNS } from "@/lib/profiles/avatar-hosts";

/** Avatar URL when it is https and on an allowed avatar host and path, otherwise `null`. */
export function resolveProfileAvatarUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const allowed = AVATAR_REMOTE_PATTERNS.some(
    ({ protocol, hostname, port, pathname }) =>
      url.protocol === `${protocol}:` &&
      url.hostname === hostname &&
      url.port === port &&
      url.pathname.startsWith(pathname.slice(0, -2)),
  );
  return allowed ? trimmed : null;
}
