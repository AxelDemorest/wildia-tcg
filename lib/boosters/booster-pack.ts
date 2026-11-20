export type BoosterPackLook = "premium" | "standard";

/** The look of a booster pack drawing; any booster without a look of its own is drawn as a standard one. */
export function boosterPackLook(slug: string): BoosterPackLook {
  return slug === "premium" ? "premium" : "standard";
}
