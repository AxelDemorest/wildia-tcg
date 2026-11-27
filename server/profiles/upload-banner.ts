import "server-only";

import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProfileBanner(
  userId: string,
  file: File,
): Promise<{ storagePath: string }> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("invalid_type");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("too_large");
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${userId}/banner.${ext}`;

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
