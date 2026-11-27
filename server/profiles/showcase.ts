import "server-only";

import {
  FEATURED_SHOWCASE_SLOT,
  SHOWCASE_SLOT_MAX,
  SHOWCASE_SLOT_MIN,
  type ShowcaseSlot,
} from "@/lib/profiles/showcase";
import { createClient } from "@/lib/supabase/server";

export async function listShowcaseSlots(profileId: string): Promise<ShowcaseSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_showcase_slots")
    .select("slot, card_id")
    .eq("profile_id", profileId)
    .order("slot");

  if (error) throw new Error(error.message);
  return (data ?? []) as ShowcaseSlot[];
}

export async function getFeaturedShowcaseCardId(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_showcase_slots")
    .select("card_id")
    .eq("profile_id", profileId)
    .eq("slot", FEATURED_SHOWCASE_SLOT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.card_id ?? null;
}

export async function setShowcaseSlot(
  profileId: string,
  slot: number,
  cardId: string | null,
): Promise<void> {
  if (slot < SHOWCASE_SLOT_MIN || slot > SHOWCASE_SLOT_MAX) {
    throw new Error("invalid_showcase_slot");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profile_showcase_slots").upsert({
    profile_id: profileId,
    slot,
    card_id: cardId,
  });

  if (error) throw new Error(error.message);
}