/**
 * The avatar initials of a name (registre rule of the admin mockup): the first letter of its first
 * two words, letters only; else its first character.
 */
export function initials(name: string): string {
  const fromWords = name
    .replace(/[^A-Za-zÀ-ÿ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (fromWords || (Array.from(name)[0] ?? "")).toUpperCase();
}
