import "server-only";

import type { PublicProfile } from "@/lib/profiles/types";
import { createClient } from "@/lib/supabase/server";
import { getFeaturedShowcaseCardId } from "@/server/profiles/showcase";

type ProfileRow = {
  id: string;
  display_name: string | null;
  bio: string | null;
  banner_url: string | null;
  avatar_url: string | null;
  locale: string;
  is_public: boolean;
};

async function mapProfile(row: ProfileRow): Promise<PublicProfile> {
  return {
    id: row.id,
    display_name: row.display_name,
    bio: row.bio,
    banner_url: row.banner_url,
    avatar_url: row.avatar_url,
    locale: row.locale,
    is_public: row.is_public,
    featured_card_id: await getFeaturedShowcaseCardId(row.id),
  };
}

export async function getOwnProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, bio, banner_url, avatar_url, locale, is_public")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

/** Public page: returns null if profile missing or not visible to viewer. */
export async function getPublicProfileForViewer(
  profileId: string,
  viewerId: string | null,
): Promise<PublicProfile | null> {
  if (viewerId === profileId) {
    return getOwnProfile(profileId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, bio, banner_url, avatar_url, locale, is_public")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const profile = await mapProfile(data as ProfileRow);
  if (!profile.is_public) return null;
  return profile;
}
