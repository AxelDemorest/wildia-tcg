/** The bounds of a number typed in an admin form, both included. */
export type Bounds = { min: number; max: number };

/**
 * A whole number within `bounds` as a form sends it, else null. Digits only: "5.0", "-5", "1e3"
 * and "" are refused.
 */
export function wholeNumberIn(raw: unknown, { min, max }: Bounds): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}
