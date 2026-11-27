/**
 * Remote hosts and paths allowed for profile avatars. Shared by `next.config.ts` (image proxy
 * `remotePatterns`) and `resolveProfileAvatarUrl`. Plain data: no framework import.
 * Every entry is https on the default port (`port: ""`), and its `pathname` ends in `/**`.
 */
export const AVATAR_REMOTE_PATTERNS = [
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/a/**" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "", pathname: "/a-/**" },
  { protocol: "https", hostname: "cdn.discordapp.com", port: "", pathname: "/avatars/**" },
] as const satisfies ReadonlyArray<{
  protocol: "https";
  hostname: string;
  port: "";
  pathname: `/${string}/**`;
}>;
