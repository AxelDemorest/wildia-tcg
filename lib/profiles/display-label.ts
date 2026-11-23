/** The name shown for an account: its display name, else its e-mail's local part, else `fallback`. */
export function displayLabel(
  displayName: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? fallback;
  return fallback;
}
