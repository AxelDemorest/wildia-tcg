import "server-only";

import { bannerStoragePath, checkBannerFile } from "@/lib/profiles/banner-file";
import { createClient } from "@/lib/supabase/server";

export async function uploadProfileBanner(
  userId: string,
  file: File,
): Promise<{ storagePath: string }> {
  const check = checkBannerFile(file);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const storagePath = bannerStoragePath(userId, check.extension);

  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("profile-banners")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ banner_url: storagePath, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return { storagePath };
}
