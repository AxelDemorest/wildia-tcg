"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseProfileForm } from "@/lib/profiles/profile-form";
import { getUser, requireUser } from "@/server/auth/require-user";
import { updateUserProfile } from "@/server/profiles/update-profile";
import { uploadProfileBanner } from "@/server/profiles/upload-banner";

export type ProfileActionState = {
  ok: boolean;
  message?: "invalid" | "featured_not_owned" | "failed";
};

export async function saveProfileSettings(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getUser();
  if (!user) {
    return { ok: false, message: "failed" };
  }

  const localeField = z.string().safeParse(formData.get("locale"));
  const input = parseProfileForm(formData);
  if (!localeField.success || !input) {
    return { ok: false, message: "invalid" };
  }
  const locale = localeField.data;

  try {
    await updateUserProfile(user.id, input);
    revalidatePath(`/${locale}/settings/profile`);
    revalidatePath(`/${locale}/players/${user.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "featured_not_owned") {
      return { ok: false, message: "featured_not_owned" };
    }
    return { ok: false, message: "failed" };
  }
}

export type BannerActionState = {
  ok: boolean;
  message?: "invalid" | "too_large" | "invalid_type" | "failed";
};

export async function saveProfileBanner(
  _prev: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  const parsed = z.object({ locale: z.string() }).safeParse({
    locale: formData.get("locale"),
  });
  if (!parsed.success) {
    return { ok: false, message: "invalid" };
  }

  const user = await requireUser(parsed.data.locale);
  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "invalid" };
  }

  try {
    await uploadProfileBanner(user.id, file);
    revalidatePath(`/${parsed.data.locale}/settings/profile`);
    revalidatePath(`/${parsed.data.locale}/players/${user.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "too_large" || e.message === "invalid_type") {
        return { ok: false, message: e.message };
      }
    }
    return { ok: false, message: "failed" };
  }
}
