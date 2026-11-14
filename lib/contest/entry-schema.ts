import { z } from "zod";

/** Contest entry: an e-mail only, normalized so duplicates are detected reliably. */
export const contestEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

export type ContestEntryInput = { email: string };

export function parseContestEmail(value: unknown): string | null {
  const parsed = contestEmailSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
