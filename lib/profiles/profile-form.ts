import { z } from "zod";
import {
  SHOWCASE_SLOT_COUNT,
  SHOWCASE_SLOT_MAX,
  SHOWCASE_SLOT_MIN,
  validateShowcaseSlotSelection,
  type ShowcaseSlotSelection,
} from "@/lib/profiles/showcase";

/** Same limits as the database (profiles_display_name_length, profiles_bio_length). */
export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 500;

const uuidOrEmpty = z.string().uuid().or(z.literal(""));

export const updateProfileInputSchema = z.object({
  bio: z.string().max(BIO_MAX).optional().nullable(),
  isPublic: z.boolean(),
  displayName: z.string().min(1).max(DISPLAY_NAME_MAX).optional().nullable(),
  showcaseSlots: z.array(z.string().uuid().nullable()).length(SHOWCASE_SLOT_COUNT),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

const formSchema = z.object({
  bio: z.string().trim().max(BIO_MAX),
  isPublic: z.boolean(),
  displayName: z.string().trim().max(DISPLAY_NAME_MAX),
  showcaseSlots: z.array(uuidOrEmpty).length(SHOWCASE_SLOT_COUNT),
});

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): unknown {
  return form.get(name) ?? "";
}

function readShowcaseSlots(form: FormLike): unknown[] {
  return Array.from({ length: SHOWCASE_SLOT_COUNT }, (_, index) =>
    text(form, `showcaseSlot${index + SHOWCASE_SLOT_MIN}`),
  );
}

/**
 * Reads the profile settings form. Blank fields become null (no bio, no name, empty showcase
 * slots); returns null when a field is invalid.
 */
export function parseProfileForm(form: FormLike): UpdateProfileInput | null {
  const parsed = formSchema.safeParse({
    bio: text(form, "bio"),
    isPublic: form.get("isPublic") === "true",
    displayName: text(form, "displayName"),
    showcaseSlots: readShowcaseSlots(form),
  });
  if (!parsed.success) return null;

  const { bio, isPublic, displayName, showcaseSlots } = parsed.data;
  const normalizedSlots: ShowcaseSlotSelection = showcaseSlots.map((cardId) => cardId || null);

  const showcaseCheck = validateShowcaseSlotSelection(normalizedSlots);
  if (!showcaseCheck.ok) return null;

  return {
    bio: bio || null,
    isPublic,
    displayName: displayName || null,
    showcaseSlots: normalizedSlots,
  };
}

export { SHOWCASE_SLOT_MIN, SHOWCASE_SLOT_MAX };