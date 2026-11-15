import "server-only";

import { updateProfileInputSchema, type UpdateProfileInput } from "@/lib/profiles/profile-form";
import { createClient } from "@/lib/supabase/server";

async function userOwnsCard(userId: string, cardId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_cards")
    .select("quantity")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.quantity ?? 0) > 0;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput): Promise<void> {
  const parsed = updateProfileInputSchema.parse(input);

  if (parsed.featuredCardId) {
    const owns = await userOwnsCard(userId, parsed.featuredCardId);
    if (!owns) {
      throw new Error("featured_not_owned");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      bio: parsed.bio?.trim() || null,
      is_public: parsed.isPublic,
      featured_card_id: parsed.featuredCardId,
      display_name: parsed.displayName?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
