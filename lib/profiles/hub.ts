export const PLAYER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProfileHubTab = "overview" | "collection" | "showcase" | "stats" | "settings";

export const PROFILE_HUB_TABS: readonly ProfileHubTab[] = [
  "overview",
  "collection",
  "showcase",
  "stats",
  "settings",
] as const;

export function profileHubPath(profileId: string, tab: ProfileHubTab): string {
  if (tab === "overview") return `/players/${profileId}`;
  return `/players/${profileId}/${tab}`;
}