import { z } from "zod";

/** Same limits as the database (profiles_display_name_length, profiles_bio_length). */
export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 500;

export const updateProfileInputSchema = z.object({
  bio: z.string().max(BIO_MAX).optional().nullable(),
  isPublic: z.boolean(),
  featuredCardId: z.string().uuid().nullable(),
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

const formSchema = z.object({
  bio: z.string().trim().max(BIO_MAX),
  isPublic: z.boolean(),
  featuredCardId: z.string().uuid().or(z.literal("")),
  displayName: z.string().trim().max(DISPLAY_NAME_MAX),
});

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): unknown {
  return form.get(name) ?? "";
}

/**
 * Reads the profile settings form. Blank fields become null (no bio, no name, no featured
 * card); returns null when a field is invalid.
 */
export function parseProfileForm(form: FormLike): UpdateProfileInput | null {
  const parsed = formSchema.safeParse({
    bio: text(form, "bio"),
    isPublic: form.get("isPublic") === "true",
    featuredCardId: text(form, "featuredCardId"),
    displayName: text(form, "displayName"),
  });
  if (!parsed.success) return null;

  const { bio, isPublic, featuredCardId, displayName } = parsed.data;
  return {
    bio: bio || null,
    isPublic,
    featuredCardId: featuredCardId || null,
    displayName: displayName || null,
  };
}
